/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

import powerbi from "powerbi-visuals-api";
import { isEmpty } from "lodash";
// d3
import * as d3 from "d3";
import { Axis as SVGAxis } from "d3-axis";
import { scaleOrdinal, scaleLinear } from "d3";
import { ScaleLogarithmic as LogScale, ScaleLinear as LinearScale, ScaleOrdinal as OrdinalScale, scaleLog, scaleBand, ScaleBand, ScaleOrdinal } from "d3-scale";

// powerbi
import NumberRange = powerbi.NumberRange;
import ValueRange = powerbi.ValueRange;
import ValueTypeDescriptor = powerbi.ValueTypeDescriptor;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;

import { valueType } from "powerbi-visuals-utils-typeutils";
import ValueType = valueType.ValueType;

// powerbi.extensibility.utils.formatting
import { valueFormatter, dateTimeSequence as dts, formattingService as fs } from "powerbi-visuals-utils-formattingutils";
import numberFormat = fs.numberFormat;
import IValueFormatter = valueFormatter.IValueFormatter;
import ValueFormatterOptions = valueFormatter.ValueFormatterOptions;
import DateTimeSequence = dts.DateTimeSequence;

// powerbi-visuals-utils-chartutils
import { axis as AxisHelper, axisInterfaces, axisScale } from "powerbi-visuals-utils-chartutils";
import IAxisProperties = axisInterfaces.IAxisProperties;
import CreateAxisOptions = axisInterfaces.CreateAxisOptions;

/**
 * HistogramAxisHelper based on AxisHelper.
 */
const DefaultOuterPadding: number = 0;

const DefaultInnerTickSize: number = 6;
const DefaultOuterTickSize: number = 0;

const OrientationLeft: string = "left";
const OrientationBottom: string = "bottom";

const DefaultXLabelMaxWidth: number = 1;
const DefaultXLabelFactor: number = 2;

const PowerOfTenOffset: number = 1e-12;

const DefaultMinInterval: number = 0;
const MinTickInterval100Pct: number = 0.01;
const MinTickIntervalInteger: number = 1;

const RecommendedNumberOfTicksSmall: number = 3;
const RecommendedNumberOfTicksMiddle: number = 5;
const RecommendedNumberOfTicksLarge: number = 8;

const AvailableWidthXAxisSmall: number = 300;
const AvailableWidthXAxisMiddle: number = 500;

const AvailableWidthYAxisSmall: number = 150;
const AvailableWidthYAxisMiddle: number = 300;

/**
 * Default ranges are for when we have a field chosen for the axis,
 * but no values are returned by the query.
 */
export let emptyDomain = [0, 0];

let InnerPaddingRatio: number = 0.2;
let TickLabelPadding: number = 2; // between text labels, used by AxisHelper
let MinOrdinalRectThickness: number = 20;

let ScalarTickLabelPadding: number = 3;
let MinTickCount: number = 2;
let DefaultBestTickCount: number = 3;

export interface CreateScaleResult {
    scale: LinearScale<any, any>;
    bestTickCount: number;
    usingDefaultDomain?: boolean;
}

export interface CreateAxisOptionsExtended extends CreateAxisOptions {
    innerPaddingRatio: number;
    tickLabelPadding: number;
    minOrdinalRectThickness: number;
    onRight?: boolean;
}

/**
 * Create a D3 axis including scale. Can be vertical or horizontal, and either datetime, numeric, or text.
 * @param options The properties used to create the axis.
 */
export function createAxis(options: CreateAxisOptionsExtended): IAxisProperties {
    let pixelSpan: number = options.pixelSpan,
        dataDomain: number[] = options.dataDomain,
        metaDataColumn: DataViewMetadataColumn = options.metaDataColumn,
        formatString: string = options.formatString,
        outerPadding: number = options.outerPadding || DefaultOuterPadding,
        isCategoryAxis: boolean = !!options.isCategoryAxis,
        isScalar: boolean = !!options.isScalar,
        isVertical: boolean = !!options.isVertical,
        useTickIntervalForDisplayUnits: boolean = !!options.useTickIntervalForDisplayUnits,
        getValueFn: (index: number, valueType: ValueType) => any = options.getValueFn,
        categoryThickness: number = options.categoryThickness,
        axisDisplayUnits: number = options.axisDisplayUnits,
        axisPrecision: number = options.axisPrecision,
        is100Pct: boolean = !!options.is100Pct,
        tickLabelPadding: number = options.tickLabelPadding || TickLabelPadding,
        onRight: boolean = options.onRight || false;

    let dataType: ValueType = getCategoryValueType(metaDataColumn, isScalar);

    // Create the Scale
    let scaleResult: CreateScaleResult = createScale(options);
    let scale: LinearScale<any, any> = scaleResult.scale;
    let bestTickCount: number = scaleResult.bestTickCount;
    let scaleDomain: number[] = scale.domain();
    let isLogScaleAllowed: boolean = isLogScalePossible(dataDomain, dataType);

    // fix categoryThickness if scalar and the domain was adjusted when making the scale "nice"
    categoryThickness = fixCategoryThickness(categoryThickness, isScalar, dataDomain, scaleDomain);

    // Prepare Tick Values for formatting
    let tickValues: any[];
    if (isScalar && bestTickCount === 1) {
        tickValues = [dataDomain[0]];
    }
    else {
        let minTickInterval: number = isScalar
            ? getMinTickValueInterval(formatString, dataType, is100Pct)
            : undefined;

        tickValues = getRecommendedTickValues(bestTickCount, scale, dataType, isScalar, minTickInterval);
    }

    if (options.scaleType && options.scaleType === axisScale.log && isLogScaleAllowed) {
        tickValues = tickValues.filter((d: any) => {
            return powerOfTen(d);
        });
    }

    let formatter: IValueFormatter = createFormatter(
        scaleDomain,
        dataDomain,
        dataType,
        isScalar,
        formatString,
        bestTickCount,
        tickValues,
        getValueFn,
        useTickIntervalForDisplayUnits,
        axisDisplayUnits,
        axisPrecision);

    // sets default orientation only, cartesianChart will fix y2 for comboChart
    // tickSize(pixelSpan) is used to create gridLines
    let axis = (isVertical
        ? onRight ? d3.axisRight(scale) : d3.axisLeft(scale)
        : d3.axisBottom(scale)
    );

    let formattedTickValues: any[] = [];
    if (metaDataColumn) {
        formattedTickValues = formatAxisTickValues(axis, tickValues, formatter, dataType, getValueFn);
    }

    let xLabelMaxWidth: number = getXLabelMaxWidth(isScalar, categoryThickness, tickLabelPadding, tickValues, scale, pixelSpan);

    return {
        scale: scale,
        axis: axis,
        formatter: formatter,
        values: formattedTickValues,
        axisType: dataType,
        axisLabel: null,
        isCategoryAxis: isCategoryAxis,
        xLabelMaxWidth: xLabelMaxWidth,
        categoryThickness: categoryThickness,
        outerPadding: outerPadding,
        usingDefaultDomain: scaleResult.usingDefaultDomain,
        isLogScaleAllowed: isLogScaleAllowed,
        dataDomain: dataDomain,
    };
}

function fixCategoryThickness(categoryThickness: number, isScalar: boolean, dataDomain: number[], scaleDomain: number[]) {
    if (categoryThickness && isScalar && dataDomain && dataDomain.length === 2) {
        let oldSpan: number = dataDomain[1] - dataDomain[0];
        let newSpan: number = scaleDomain[1] - scaleDomain[0];
        if (oldSpan > 0 && newSpan > 0) {
            categoryThickness = categoryThickness * oldSpan / newSpan;
        }
    }
    return categoryThickness;
}

function getXLabelMaxWidth(isScalar: boolean, categoryThickness: number, tickLabelPadding: number, tickValues: any[], scale: d3.ScaleLinear<any, any>, pixelSpan: number) {
    let xLabelMaxWidth: number;
    // Use category layout of labels if specified, otherwise use scalar layout of labels
    if (!isScalar && categoryThickness) {
        xLabelMaxWidth = Math.max(DefaultXLabelMaxWidth, categoryThickness - tickLabelPadding * DefaultXLabelFactor);
    }
    else {
        // When there are 0 or 1 ticks, then xLabelMaxWidth = pixelSpan
        xLabelMaxWidth = tickValues.length > DefaultXLabelMaxWidth
            ? getScalarLabelMaxWidth(scale, tickValues)
            : pixelSpan;
        xLabelMaxWidth = xLabelMaxWidth - ScalarTickLabelPadding * DefaultXLabelFactor;
    }
    return xLabelMaxWidth;
}

/**
 * Indicates whether the number is power of 10.
 */
export function powerOfTen(d: any): boolean {
    let value: number = Math.abs(d);
    // formula log2(Y)/log2(10) = log10(Y)
    // because double issues this won"t return exact value
    // we need to ceil it to nearest number.
    let log10: number = Math.log(value) / Math.LN10;
    log10 = Math.ceil(log10 - 1e-12);

    return value / Math.pow(10, log10) === 1;
}

function getScalarLabelMaxWidth(scale: LinearScale<any, any>, tickValues: number[]): number {
    // find the distance between two ticks. scalar ticks can be anywhere, such as:
    // |---50----------100--------|
    if (scale && !isEmpty(tickValues)) {
        return Math.abs(scale(tickValues[1]) - scale(tickValues[0]));
    }

    return DefaultXLabelMaxWidth;
}

export function createFormatter(
    scaleDomain: any[],
    dataDomain: any[],
    dataType: any,
    isScalar: boolean,
    formatString: string,
    bestTickCount: number,
    tickValues: any[],
    getValueFn: any,
    useTickIntervalForDisplayUnits: boolean = false,
    axisDisplayUnits?: number,
    axisPrecision?: number): IValueFormatter {

    let formatter: IValueFormatter;
    if (dataType.dateTime) {
        if (isScalar) {
            let value: Date = new Date(scaleDomain[0]);
            let value2: Date = new Date(scaleDomain[1]);
            // datetime with only one value needs to pass the same value
            // (from the original dataDomain value, not the adjusted scaleDomain)
            // so formatting works correctly.
            if (bestTickCount === 1) {
                value = value2 = new Date(dataDomain[0]);
            }

            // this will ignore the formatString and create one based on the smallest non-zero portion of the values supplied.
            formatter = valueFormatter.create({
                format: formatString,
                value: value,
                value2: value2,
                tickCount: bestTickCount,
            });
        }
        else {
            // Use the model formatString for ordinal datetime
            formatter = valueFormatter.createDefaultFormatter(formatString, true);
        }
    }
    else {
        if (useTickIntervalForDisplayUnits && isScalar && tickValues.length > 1) {
            let value1: number = axisDisplayUnits
                ? axisDisplayUnits
                : tickValues[1] - tickValues[0];

            let options: ValueFormatterOptions = {
                format: formatString,
                value: value1,
                value2: 0, // force tickInterval or display unit to be used
                allowFormatBeautification: true,
            };

            if (axisPrecision) {
                options.precision = axisPrecision;
            } else {
                options.precision = AxisHelper.calculateAxisPrecision(
                    tickValues[0],
                    tickValues[1],
                    axisDisplayUnits,
                    formatString);
            }

            formatter = valueFormatter.create(options);
        }
        else {
            // do not use display units, just the basic value formatter
            // datetime is handled above, so we are ordinal and either boolean, numeric, or text.
            formatter = valueFormatter.createDefaultFormatter(formatString, true);
        }
    }

    return formatter;
}

export function getMinTickValueInterval(formatString: string, columnType: ValueType, is100Pct?: boolean): number {
    let isCustomFormat: boolean = formatString && !numberFormat.isStandardFormat(formatString);

    if (isCustomFormat) {
        let precision: number = numberFormat.getCustomFormatMetadata(formatString, true).precision;

        if (formatString.indexOf("%") > -1) {
            precision += 2; // percent values are multiplied by 100 during formatting
        }

        return Math.pow(10, -precision);
    }
    else if (is100Pct) {
        return MinTickInterval100Pct;
    }
    else if (columnType.integer) {
        return MinTickIntervalInteger;
    }

    return DefaultMinInterval;
}

/**
 * Format the linear tick labels or the category labels.
 */
function formatAxisTickValues(
    axis: SVGAxis<any>,
    tickValues: any[],
    formatter: IValueFormatter,
    dataType: ValueType,
    getValueFn?: (index: number, valueType: ValueType) => any): any[] {

    let formattedTickValues: any[] = [];

    if (!getValueFn) {
        getValueFn = data => data;
    }

    if (formatter) {
        axis.tickFormat(d => formatter.format(getValueFn(d, dataType)));
        formattedTickValues = tickValues.map(d => formatter.format(getValueFn(d, dataType)));
    }
    else {
        formattedTickValues = tickValues.map((d) => getValueFn(d, dataType));
    }

    return formattedTickValues;
}

export function isLogScalePossible(domain: any[], axisType?: ValueType): boolean {
    if (domain == null || domain.length < 2 || isDateTime(axisType)) {
        return false;
    }

    return (domain[0] > 0 && domain[1] > 0)
        || (domain[0] < 0 && domain[1] < 0); // doman must exclude 0
}

export function isDateTime(descriptor: ValueTypeDescriptor): boolean {
    return !!(descriptor && descriptor.dateTime);
}

export function getRecommendedTickValues(
    maxTicks: number,
    scale: LinearScale<any, any>,
    axisType: ValueType,
    isScalar: boolean,
    minTickInterval?: number): any[] {

    if (!isScalar || isOrdinalScale(scale)) {
        return getRecommendedTickValuesForAnOrdinalRange(maxTicks, <any>scale.domain());
    }
    else if (isDateTime(axisType)) {
        return getRecommendedTickValuesForADateTimeRange(maxTicks, scale.domain());
    }

    return getRecommendedTickValuesForAQuantitativeRange(maxTicks, scale, minTickInterval);
}

export function getRecommendedTickValuesForAnOrdinalRange(maxTicks: number, labels: string[]): string[] {
    let tickLabels: string[] = [];

    // return no ticks in this case
    if (maxTicks <= 0) {
        return tickLabels;
    }

    let len: number = labels.length;

    if (maxTicks > len) {
        return labels;
    }

    for (let i: number = 0, step = Math.ceil(len / maxTicks); i < len; i += step) {
        tickLabels.push(labels[i]);
    }

    return tickLabels;
}

export function getRecommendedTickValuesForAQuantitativeRange(
    maxTicks: number,
    scale: LinearScale<any, any>,
    minInterval?: number): number[] {

    let tickLabels: number[] = [];

    // if maxticks is zero return none
    if (maxTicks === 0) {
        return tickLabels;
    }

    let quantitiveScale: LinearScale<any, any> = scale;

    if (quantitiveScale.ticks) {
        tickLabels = quantitiveScale.ticks(maxTicks);

        if (tickLabels.length > maxTicks && maxTicks > 1) {
            tickLabels = quantitiveScale.ticks(maxTicks - 1);
        }

        if (tickLabels.length < MinTickCount) {
            tickLabels = quantitiveScale.ticks(maxTicks + 1);
        }

        tickLabels = createTrueZeroTickLabel(tickLabels);

        if (minInterval && tickLabels.length > 1) {
            let tickInterval: number = tickLabels[1] - tickLabels[0];

            while (tickInterval > 0 && tickInterval < minInterval) {
                for (let i = 1; i < tickLabels.length; i++) {
                    tickLabels.splice(i, 1);
                }

                tickInterval = tickInterval * 2;
            }

            // keep at least two labels - the loop above may trim all but one if we have odd # of tick labels and dynamic range < minInterval
            if (tickLabels.length === 1) {
                tickLabels.push(tickLabels[0] + minInterval);
            }
        }

        return tickLabels;
    }

    return tickLabels;
}

function getRecommendedTickValuesForADateTimeRange(maxTicks: number, dataDomain: number[]): number[] {
    let tickLabels: number[] = [];

    if (dataDomain[0] === 0 && dataDomain[1] === 0) {
        return [];
    }

    let dateTimeTickLabels: Date[] = DateTimeSequence.calculate(
        new Date(dataDomain[0]),
        new Date(dataDomain[1]), maxTicks).sequence;

    tickLabels = dateTimeTickLabels.map(d => d.getTime());
    tickLabels = ensureValuesInRange(tickLabels, dataDomain[0], dataDomain[1]);

    return tickLabels;
}

export function isOrdinalScale(scale: any): boolean {
    return scale.invert == undefined;
}

/**
 * Gets the ValueType of a category column, defaults to Text if the type is not present.
 */
export function getCategoryValueType(metadataColumn: DataViewMetadataColumn, isScalar?: boolean): ValueType {
    if (metadataColumn && columnDataTypeHasValue(metadataColumn.type)) {
        return <ValueType>metadataColumn.type;
    }

    if (isScalar) {
        return ValueType.fromDescriptor({ numeric: true });
    }

    return ValueType.fromDescriptor({ text: true });
}

export function columnDataTypeHasValue(dataType: ValueTypeDescriptor) {
    return dataType && (dataType.bool || dataType.numeric || dataType.text || dataType.dateTime);
}

export function createScale(options: CreateAxisOptionsExtended): CreateScaleResult {
    let pixelSpan: number = options.pixelSpan,
        dataDomain: number[] = options.dataDomain,
        metaDataColumn: DataViewMetadataColumn = options.metaDataColumn,
        outerPadding: number = options.outerPadding || DefaultOuterPadding,
        isScalar: boolean = !!options.isScalar,
        isVertical: boolean = !!options.isVertical,
        forcedTickCount: number = options.forcedTickCount,
        categoryThickness: number = options.categoryThickness,
        shouldClamp: boolean = !!options.shouldClamp,
        maxTickCount: number = options.maxTickCount,
        innerPaddingRatio: number = options.innerPaddingRatio || InnerPaddingRatio,
        minOrdinalRectThickness: number = options.minOrdinalRectThickness || MinOrdinalRectThickness;

    let dataType: ValueType = getCategoryValueType(metaDataColumn, isScalar);

    let maxTicks: number = getMaxTicks(isVertical, pixelSpan, maxTickCount);

    let scalarDomain: number[] = dataDomain ? dataDomain.slice() : null;

    let bestTickCount: number = maxTicks;
    let scale: LinearScale<any, any> | OrdinalScale<any, any> | ScaleBand<any>;
    let usingDefaultDomain: boolean = false;

    if (!dataDomain || (dataDomain.length === 2 && !dataDomain[0] && !dataDomain[1])
        || (dataDomain.length !== 2 && isScalar)) {
        usingDefaultDomain = true;
        dataDomain = getEmptyDomain(dataType);

        if (isOrdinal(dataType)) {
            scale = createOrdinalScale(
                pixelSpan,
                dataDomain,
                innerPaddingRatio,
                categoryThickness ? outerPadding / categoryThickness : 0);
        }
        else {
            scale = createNumericalScale(
                options.scaleType,
                pixelSpan,
                dataDomain,
                dataType,
                outerPadding,
                maxTicks);
        }
    }
    else {
        if (isScalar && dataDomain.length > 0) {
            bestTickCount = forcedTickCount !== undefined
                ? (maxTicks !== 0 ? forcedTickCount : 0)
                : getBestNumberOfTicks(
                    dataDomain[0],
                    dataDomain[dataDomain.length - 1],
                    [metaDataColumn],
                    maxTicks,
                    dataType.dateTime);

            scalarDomain = getScalarDomain(dataDomain, scalarDomain);
        }

        if (isScalar && dataType.numeric && !dataType.dateTime) {
            // Note: Don't pass bestTickCount to createNumericalScale, because it overrides boundaries of the domain.
            scale = createNumericalScale(
                options.scaleType,
                pixelSpan,
                scalarDomain,
                dataType,
                outerPadding,
                null,
                shouldClamp);
            bestTickCount = maxTicks === 0 ? 0 : Math.floor((pixelSpan - outerPadding * 2) / minOrdinalRectThickness);
        }
        else if (isScalar && dataType.dateTime) {
            // Use of a linear scale, instead of a D3.time.scale, is intentional since we want
            // to control the formatting of the time values, since d3"s implementation isn"t
            // in accordance to our design. scalarDomain: should already be in long-int time (via category.values[0].getTime())
            scale = createLinearScale(pixelSpan, scalarDomain, outerPadding, null, shouldClamp); // DO NOT PASS TICKCOUNT
        }
        else if (dataType.text || dataType.dateTime || dataType.numeric || dataType.bool) {
            scale = createOrdinalScale(
                pixelSpan,
                scalarDomain,
                innerPaddingRatio,
                categoryThickness ? outerPadding / categoryThickness : 0);

            bestTickCount = maxTicks === 0 ? 0
                : Math.min(
                    scalarDomain.length,
                    (pixelSpan - outerPadding * 2) / minOrdinalRectThickness);
        }
    }

    normalizeInfinityInScale(<LinearScale<any, any>>scale);

    return {
        scale: <LinearScale<any, any>>scale,
        bestTickCount: bestTickCount,
        usingDefaultDomain: usingDefaultDomain,
    };
}

function getScalarDomain(dataDomain: number[], scalarDomain: number[]) {
    let normalizedRange: ValueRange<number> = normalizeLinearDomain({
        min: dataDomain[0],
        max: dataDomain[dataDomain.length - 1]
    });
    scalarDomain = [
        normalizedRange.min,
        normalizedRange.max
    ];
    return scalarDomain;
}

function getEmptyDomain(dataType: valueType.ValueType) {
    if (dataType.dateTime || !isOrdinal(dataType)) {
        return emptyDomain;
    }
    else { // ordinal
        return [];
    }
}

function getMaxTicks(isVertical: boolean, pixelSpan: number, maxTickCount: number) {
    let maxTicks: number = isVertical
        ? getRecommendedNumberOfTicksForYAxis(pixelSpan)
        : getRecommendedNumberOfTicksForXAxis(pixelSpan);
    if (maxTickCount &&
        maxTicks > maxTickCount) {
        maxTicks = maxTickCount;
    }
    return maxTicks;
}

export function normalizeInfinityInScale(scale: LinearScale<any, any>): void {
    // When large values (eg Number.MAX_VALUE) are involved, a call to scale.nice occasionally
    // results in infinite values being included in the domain. To correct for that, we need to
    // re-normalize the domain now to not include infinities.
    let scaledDomain: number[] = scale.domain();

    for (let i: number = 0, len = scaledDomain.length; i < len; ++i) {
        if (scaledDomain[i] === Number.POSITIVE_INFINITY) {
            scaledDomain[i] = Number.MAX_VALUE;
        }
        else if (scaledDomain[i] === Number.NEGATIVE_INFINITY) {
            scaledDomain[i] = -Number.MAX_VALUE;
        }
    }

    scale.domain(scaledDomain);
}

export function createOrdinalScale(
    pixelSpan: number,
    dataDomain: any[],
    innerPaddingRatio: number,
    outerPaddingRatio: number
): ScaleBand<any> {
    return dataDomain.every((x, index) => (index === 0 || x === dataDomain[0]))
        ? scaleBand()
            .range([0, pixelSpan])
            .domain(dataDomain)
        // Avoid using rangeRoundBands here as it is adding some extra padding to the axis*/
        : scaleBand()
            .range([0, pixelSpan])
            .paddingInner(innerPaddingRatio)
            .paddingOuter(outerPaddingRatio)
            .domain(dataDomain);
}

function normalizeLinearDomain(domain: NumberRange): NumberRange {
    if (isNaN(domain.min) || isNaN(domain.max)) {
        domain.min = emptyDomain[0];
        domain.max = emptyDomain[1];
    }
    else if (domain.min === domain.max) {
        // d3 linear scale will give zero tickValues if max === min, so extend a little
        domain.min = domain.min < 0 ? domain.min * 1.2 : domain.min * 0.8;
        domain.max = domain.max < 0 ? domain.max * 0.8 : domain.max * 1.2;
    }
    else {
        // Check that min is very small and is a negligable portion of the whole domain.
        // (fix floating pt precision bugs)
        // sometimes highlight value math causes small negative numbers which makes the axis add
        // a large tick interval instead of just rendering at zero.
        if (Math.abs(domain.min) < 0.0001 && domain.min / (domain.max - domain.min) < 0.0001) {
            domain.min = 0;
        }
    }

    return domain;
}

// this function can return different scales e.g. log, linear
// NOTE: export only for testing, do not access directly
export function createNumericalScale(
    axisScaleType: string,
    pixelSpan: number,
    dataDomain: any[],
    dataType: ValueType,
    outerPadding: number = 0,
    niceCount?: number,
    shouldClamp?: boolean): LinearScale<any, any> {

    if (axisScaleType === axisScale.log && isLogScalePossible(dataDomain, dataType)) {
        return createLogScale(pixelSpan, dataDomain, outerPadding, niceCount);
    }

    return createLinearScale(pixelSpan, dataDomain, outerPadding, niceCount, shouldClamp);
}

function createLogScale(
    pixelSpan: number,
    dataDomain: any[],
    outerPadding: number = 0,
    niceCount?: number): LinearScale<any, any> {

    let scale: LogScale<number, number> = scaleLog()
        .range([outerPadding, pixelSpan - outerPadding])
        .domain([dataDomain[0], dataDomain[1]])
        .clamp(true);

    if (niceCount) {
        (<LinearScale<any, any>>scale).nice(niceCount);
    }

    return scale;
}

// NOTE: export only for testing, do not access directly
export function createLinearScale(
    pixelSpan: number,
    dataDomain: any[],
    outerPadding: number = 0,
    niceCount?: number,
    shouldClamp?: boolean): LinearScale<any, any> {

    let scale: LinearScale<any, any> = scaleLinear()
        .range([outerPadding, pixelSpan - outerPadding])
        .domain([dataDomain[0], dataDomain[1]])
        .clamp(shouldClamp);

    // we use millisecond ticks since epoch for datetime, so we don"t want any "nice" with numbers like 17398203392.
    if (niceCount) {
        scale.nice(niceCount);
    }

    return scale;
}

export function getRecommendedNumberOfTicksForXAxis(availableWidth: number): number {
    if (availableWidth < AvailableWidthXAxisSmall) {
        return RecommendedNumberOfTicksSmall;
    }

    if (availableWidth < AvailableWidthXAxisMiddle) {
        return RecommendedNumberOfTicksMiddle;
    }

    return RecommendedNumberOfTicksLarge;
}

export function getRecommendedNumberOfTicksForYAxis(availableWidth: number): number {
    if (availableWidth < AvailableWidthYAxisSmall) {
        return RecommendedNumberOfTicksSmall;
    }

    if (availableWidth < AvailableWidthYAxisMiddle) {
        return RecommendedNumberOfTicksMiddle;
    }

    return RecommendedNumberOfTicksLarge;
}

export function isOrdinal(descriptor: ValueTypeDescriptor): boolean {
    return !!(descriptor
        && (descriptor.text
            || descriptor.bool
            || (descriptor.misc && descriptor.misc.barcode)
            || (descriptor.geography && descriptor.geography.postalCode)));
}

/**
 * Get the best number of ticks based on minimum value, maximum value,
 * measure metadata and max tick count.
 *
 * @param min The minimum of the data domain.
 * @param max The maximum of the data domain.
 * @param valuesMetadata The measure metadata array.
 * @param maxTickCount The max count of intervals.
 * @param isDateTime - flag to show single tick when min is equal to max.
 */
export function getBestNumberOfTicks(
    min: number,
    max: number,
    valuesMetadata: DataViewMetadataColumn[],
    maxTickCount: number,
    isDateTime?: boolean): number {

    if (isNaN(min) || isNaN(max)) {
        return DefaultBestTickCount;
    }

    if (maxTickCount <= 1 || (max <= 1 && min >= -1)) {
        return maxTickCount;
    }

    if (min === max) {
        // datetime needs to only show one tick value in this case so formatting works correctly
        if (!!isDateTime) {
            return 1;
        }

        return DefaultBestTickCount;
    }

    if (hasNonIntegerData(valuesMetadata)) {
        return maxTickCount;
    }

    // e.g. 5 - 2 + 1 = 4, => [2,3,4,5]
    return Math.min(max - min + 1, maxTickCount);
}

export function ensureValuesInRange(values: number[], min: number, max: number): number[] {
    let filteredValues: number[] = values.filter(v => v >= min && v <= max);

    if (filteredValues.length < 2) {
        filteredValues = [min, max];
    }

    return filteredValues;
}

export function hasNonIntegerData(valuesMetadata: DataViewMetadataColumn[]): boolean {
    for (let i: number = 0, len = valuesMetadata.length; i < len; i++) {
        let currentMetadata: DataViewMetadataColumn = valuesMetadata[i];

        if (currentMetadata && currentMetadata.type && !currentMetadata.type.integer) {
            return true;
        }
    }

    return false;
}

/**
 * Round out very small zero tick values (e.g. -1e-33 becomes 0).
 *
 * @param ticks Array of numbers (from d3.scale.ticks([maxTicks])).
 * @param epsilon Max ratio of calculated tick interval which we will recognize as zero.
 *
 * e.g.
 *     ticks = [-2, -1, 1e-10, 3, 4]; epsilon = 1e-5;
 *     closeZero = 1e-5 * | 2 - 1 | = 1e-5
 *     // Tick values <= 1e-5 replaced with 0
 *     return [-2, -1, 0, 3, 4];
 */
function createTrueZeroTickLabel(ticks: number[], epsilon: number = 1e-5): number[] {
    if (!ticks || ticks.length < 2) {
        return ticks;
    }

    let closeZero: number = epsilon * Math.abs(ticks[1] - ticks[0]);

    return ticks.map((tick) => Math.abs(tick) <= closeZero ? 0 : tick);
}
