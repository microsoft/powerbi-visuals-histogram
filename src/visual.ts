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

// d3
import "core-js/stable";
import * as d3 from "d3";
type Selection<T> = d3.Selection<any, T, any, any>;

import { ScaleLinear as LinearScale, scaleLinear } from "d3-scale";

interface LayoutBin extends d3.Bin<number, number> {
    y?: number;
}

// powerbi
import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;

// powerbi.extensibility
import IVisual = powerbi.extensibility.IVisual;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import IVisualEventService = powerbi.extensibility.IVisualEventService;

// powerbi.extensibility.visual
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

// powerbi-visuals-utils-typeutils
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";

// powerbi-visuals-utils-svgutils
import { shapesInterfaces, CssConstants, manipulation } from "powerbi-visuals-utils-svgutils";
import ISize = shapesInterfaces.ISize;
import translate = manipulation.translate;
import translateAndRotate = manipulation.translateAndRotate;
import ClassAndSelector = CssConstants.ClassAndSelector;
import createClassAndSelector = CssConstants.createClassAndSelector;

// powerbi-visuals-utils-formattingutils
import { valueFormatter as ValueFormatter, textMeasurementService as tms } from "powerbi-visuals-utils-formattingutils";
import IValueFormatter = ValueFormatter.IValueFormatter;
import TextProperties = tms.TextProperties;
import textMeasurementService = tms.textMeasurementService;

// powerbi-visuals-utils-colorutils
import { ColorHelper } from "powerbi-visuals-utils-colorutils";

// powerbi-visuals-utils-chartutils
import { axis, dataLabelUtils, dataLabelInterfaces, axisInterfaces, axisScale } from "powerbi-visuals-utils-chartutils";
import ILabelLayout = dataLabelInterfaces.ILabelLayout;
import IAxisProperties = axisInterfaces.IAxisProperties;
import willLabelsFit = axis.LabelLayoutStrategy.willLabelsFit;
import willLabelsWordBreak = axis.LabelLayoutStrategy.willLabelsWordBreak;

// powerbi-visuals-utils-interactivityutils
import { interactivitySelectionService, interactivityBaseService, interactivityUtils } from "powerbi-visuals-utils-interactivityutils";
import appendClearCatcher = interactivityBaseService.appendClearCatcher;
import IInteractiveBehavior = interactivityBaseService.IInteractiveBehavior;
import IInteractivityService = interactivityBaseService.IInteractivityService;
import createInteractivitySelectionService = interactivitySelectionService.createInteractivitySelectionService;
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;

// powerbi-visuals-utils-tooltiputils
import { TooltipEventArgs, ITooltipServiceWrapper, createTooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";

// histogram
import {
    HistogramGeneralSettings,
    HistogramAxisStyle,
    HistogramAxisSettings,
    HistogramXAxisSettings,
    HistogramYAxisSettings,
    HistogramPositionType,
    HistogramLabelSettings,
    HistogramSettings
} from "./settings";

import { HistogramData, HistogramDataPoint, HistogramSubDataPoint, HistogramBorderValues } from "./dataInterfaces";
import { HistogramBehavior, HistogramBehaviorOptions } from "./behavior";
import { updateOpacity } from "./utils";
import * as HistogramAxisHelper from "./axisHelper";
import * as Default from "./constants";

import "../style/visual.less";
import { Axis } from "d3";

interface HistogramValue {
    value: number;
    selectionId: ISelectionId;
    frequency: number;
}

interface ILegend {
    text: string;
    transform?: string;
    dx?: string;
    dy?: string;
    color: string;
}

interface IPaneProperties {
    binsCount: number,
    binSize: number,
    isBinSizeEnabled: boolean,
}

interface IBinValues {
    bins: LayoutBin[],
    binSize: number;
}

interface IBinSettings {
    binValues: IBinValues,
    shouldUpdateBinSize: boolean;
}

export class Visual implements IVisual {
    private static ClassName: string = "histogram";

    private static Axes: ClassAndSelector = createClassAndSelector("axes");
    private static Axis: ClassAndSelector = createClassAndSelector("axis");
    private static XAxis: ClassAndSelector = createClassAndSelector("xAxis");
    private static YAxis: ClassAndSelector = createClassAndSelector("yAxis");

    private static Columns: ClassAndSelector = createClassAndSelector("columns");
    private static Column: ClassAndSelector = createClassAndSelector("column");

    private static Legends: ClassAndSelector = createClassAndSelector("legends");
    private static Legend: ClassAndSelector = createClassAndSelector("legend");

    private static LabelGraphicsContext: ClassAndSelector = createClassAndSelector("labelGraphicsContext");

    public static CurrentBinSize: number = HistogramGeneralSettings.DefaultBinSize;
    public static CurrentBinsCount: number = HistogramGeneralSettings.DefaultBins;
    
    private events: IVisualEventService;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private colorHelper: ColorHelper;

    private columnWidth: number = 0;
    private yTitleMargin: number = 0;
    private outerPadding: number = 0;
    private xAxisProperties: IAxisProperties;
    private yAxisProperties: IAxisProperties;

    private data: HistogramData;

    private viewport: IViewport;
    private viewportIn: IViewport;

    private visualHost: IVisualHost;
    private localizationManager: ILocalizationManager;
    private interactivityService: IInteractivityService<SelectableDataPoint>;
    private behavior: IInteractiveBehavior;

    private root: Selection<any>;
    private clearCatcher: Selection<any>;
    private main: Selection<any>;
    private axes: Selection<any>;
    private axisX: Selection<any>;
    private axisY: Selection<any>;
    private legend: Selection<any>;
    private columns: Selection<HistogramDataPoint>;
    private labelGraphicsContext: Selection<any>;

    private get columnsSelection(): Selection<HistogramDataPoint> {
        return this.main
            .select(Visual.Columns.selectorName)
            .selectAll(Visual.Column.selectorName);
    }
    private get legendSelection(): Selection<ILegend> {
        return this.main
            .select(Visual.Legends.selectorName)
            .selectAll(Visual.Legend.selectorName);
    }

    private get strokeWidth(): number {
        return this.colorHelper.isHighContrast ? 2 : 0;
    }

    constructor(options: VisualConstructorOptions) {
        this.visualHost = options.host;

        this.events = options.host.eventService;

        this.localizationManager = this.visualHost.createLocalizationManager();

        this.interactivityService = createInteractivitySelectionService(this.visualHost);
        this.behavior = HistogramBehavior.CREATE();

        this.colorHelper = new ColorHelper(this.visualHost.colorPalette);

        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            options.host.tooltipService,
            options.element
        );

        this.root = d3.select(options.element)
            .append("svg")
            .classed(Visual.ClassName, true);

        this.clearCatcher = appendClearCatcher(this.root);

        this.main = this.root.append("g");

        this.columns = this.main
            .append("g")
            .classed(Visual.Columns.className, true);

        this.axes = this.main
            .append("g")
            .classed(Visual.Axes.className, true);

        this.axisX = this.axes
            .append("g")
            .classed(Visual.Axis.className, true)
            .classed(Visual.XAxis.className, true);

        this.axisY = this.axes
            .append("g")
            .classed(Visual.Axis.className, true)
            .classed(Visual.YAxis.className, true);

        this.legend = this.main
            .append("g")
            .classed(Visual.Legends.className, true);

        this.labelGraphicsContext = this.main
            .append("g")
            .classed(Visual.LabelGraphicsContext.className, true);
    }

    public static GET_FREQUENCIES(categorical) {
        if (categorical.values &&
            categorical.values[0] &&
            categorical.values[0].values
        ) {
            return <number[]>categorical.values[0].values;
        }

        return [];
    }

    public static CONVERTER(
        dataView: DataView,
        visualHost: IVisualHost,
        localizationManager: ILocalizationManager,
        colorHelper: ColorHelper
    ): HistogramData {

        let settings: HistogramSettings,
            categoryColumn: DataViewCategoryColumn = dataView.categorical.categories[0],
            numericalValues: number[] = [],
            bins: LayoutBin[],
            dataPoints: HistogramDataPoint[],
            frequencies: number[] = [],
            sumFrequency: number = Default.SumFrequency,
            borderValues: HistogramBorderValues,
            sourceValues: number[] = <number[]>categoryColumn.values;

        settings = Visual.parseSettings(dataView, colorHelper);

        if (!settings
            || !Visual.ARE_VALUES_NUMBERS(categoryColumn)
            || sourceValues.length < Default.MinAmountOfValues
        ) {
            return null;
        }

        frequencies = Visual.GET_FREQUENCIES(dataView.categorical);

        let values: HistogramValue[] = Visual.getValuesByFrequencies(
            visualHost,
            categoryColumn,
            sourceValues,
            frequencies
        );

        values.forEach((value: HistogramValue) => {
            numericalValues.push(value.value);
            sumFrequency += value.frequency;
        });

        const binsCount: number =
            (settings.general.bins && settings.general.bins > HistogramGeneralSettings.MinNumberOfBins)
            ? settings.general.bins
            : d3.histogram()(numericalValues).length; // predict bins count for interval correction

        const binSize = settings.general.binSize 
            ? settings.general.binSize 
            : HistogramGeneralSettings.DefaultBinSize;
    
        const { binValues, shouldUpdateBinSize } = Visual.GET_BINS_SETTINGS(binsCount, binSize, settings.general.isBinSizeEnabled, numericalValues);

        bins = binValues.bins;
        settings.general.bins = binValues.bins.length;

        if (shouldUpdateBinSize) {
            settings.general.binSize = Visual.roundTo(binValues.binSize, 2);
        }

        Visual.CurrentBinSize = settings.general.binSize;
        Visual.CurrentBinsCount = settings.general.bins;
        
        Visual.setFrequency(bins, settings.general.frequency, values, sumFrequency);

        borderValues = Visual.GET_BORDER_VALUES(bins);

        // min-max for Y axis
        Visual.getMinMaxFoxYAxis(settings.yAxis, borderValues);

        // min-max for X axis
        Visual.setMinMaxForXAxis(settings.xAxis, borderValues);

        // formatters
        let formatters: { valueFormatter?: IValueFormatter, xLabelFormatter?: IValueFormatter, yLabelFormatter?: IValueFormatter } = {};
        if (values.length >= Default.MinAmountOfValues) {
            formatters = Visual.createFormatters(dataView, values, settings);
        }

        dataPoints = Visual.getDataPoints(
            values,
            bins,
            settings,
            formatters.yLabelFormatter,
            formatters.xLabelFormatter,
            localizationManager
        );

        return {
            dataPoints,
            borderValues,
            settings,
            xLabelFormatter: formatters.xLabelFormatter,
            yLabelFormatter: formatters.yLabelFormatter,
            formatter: formatters.valueFormatter,
            xLegendSize: Visual.getLegendSize(settings.xAxis),
            yLegendSize: Visual.getLegendSize(settings.yAxis),
            xCorrectedMin: null,
            xCorrectedMax: null
        };
    }

    public static GET_BINS_SETTINGS = (
        binsCount: number, 
        binSize: number, 
        isBinSizeEnabled: boolean, 
        numericalValues: number[]
    ): IBinSettings => {

        if (binsCount !== Visual.CurrentBinsCount) {
            return {
                binValues: Visual.getBinValues(binsCount, 0, numericalValues),
                shouldUpdateBinSize: true
            }
        } else if (binSize !== Visual.CurrentBinSize && binSize !== 0 && isBinSizeEnabled) {
            return {
                binValues: Visual.getBinValues(0, binSize, numericalValues),
                shouldUpdateBinSize: false
            }
        } else {
            return {
                binValues: Visual.getBinValues(Visual.CurrentBinsCount, Visual.CurrentBinSize, numericalValues),
                shouldUpdateBinSize: false
            }
        }
    }

    private static getBinValues(binsCount: number, binSize: number, numericalValues: number[]): IBinValues {
        const [min, max] = d3.extent(numericalValues);
        const maxBinSize = max - min;

        const getBinSize = (): number => {     
            if (binSize < HistogramGeneralSettings.MinBinSize) {
                return HistogramGeneralSettings.MinBinSize;
            }  
            else if (binSize > maxBinSize) {
                return maxBinSize;
            }

            return binSize;
        };   

        const interval: number = binsCount > 0 
            ? (max - min) / binsCount
            : getBinSize();

        const bins = d3.histogram().thresholds(d3.range(min, max, interval))(numericalValues); 

        return {
            bins: bins,
            binSize: interval
        };
    }

    private static setFrequency(bins: LayoutBin[], settingsFrequency: boolean, values: HistogramValue[], sumFrequency: number) { 
        bins.forEach((bin: LayoutBin, index: number) => {
            let filteredValues: HistogramValue[],
                frequency: number;

            filteredValues = values.filter((value: HistogramValue) => {
                return Visual.isValueContainedInRange(value, bin, index);
            });

            frequency = filteredValues.reduce((previousValue: number, currentValue: HistogramValue): number => {
                return previousValue + currentValue.frequency;
            }, 0);

            bin.y = settingsFrequency
                ? frequency
                : frequency / sumFrequency;
            });
    }

    private static roundTo (number: number, places: number): number {
        const factor = 10 ** places;
        return Math.round(number * factor) / factor;
    };

    private static setMinMaxForXAxis(xAxisSettings: HistogramXAxisSettings, borderValues: HistogramBorderValues) {
        let maxXValue: number = (xAxisSettings.end !== null) && (xAxisSettings.end > borderValues.minX)
            ? xAxisSettings.end
            : borderValues.maxX;
        let minXValue: number = (xAxisSettings.start !== null) && (xAxisSettings.start < maxXValue)
            ? xAxisSettings.start
            : borderValues.minX;
        xAxisSettings.start = Visual.GET_CORRECT_X_AXIS_VALUE(minXValue);
        xAxisSettings.end = Visual.GET_CORRECT_X_AXIS_VALUE(maxXValue);
    }

    private static getMinMaxFoxYAxis(yAxisSettings: HistogramXAxisSettings, borderValues: HistogramBorderValues) {
        let maxYValue: number = (yAxisSettings.end !== null) && (yAxisSettings.end > yAxisSettings.start)
            ? yAxisSettings.end
            : borderValues.maxY;
        let minYValue: number = yAxisSettings.start < maxYValue
            ? yAxisSettings.start
            : 0;
        yAxisSettings.start = Visual.GET_CORRECT_Y_AXIS_VALUE(minYValue);
        yAxisSettings.end = Visual.GET_CORRECT_Y_AXIS_VALUE(maxYValue);
        return yAxisSettings;
    }

    private static createFormatters(dataView: powerbi.DataView, values: HistogramValue[], settings: HistogramSettings) {
        let valueFormatter = ValueFormatter.create({
            format: ValueFormatter.getFormatStringByColumn(dataView.categorical.categories[0].source),
            value: values[0].value,
            value2: values[values.length - 1].value,
            precision: settings.labels.precision
        });
        let xLabelFormatter = ValueFormatter.create({
            value: settings.xAxis.displayUnits === 0
                ? values[values.length - 1].value
                : settings.xAxis.displayUnits,
            precision: settings.xAxis.precision
        });
        let yLabelFormatter = ValueFormatter.create({
            value: settings.yAxis.displayUnits,
            precision: settings.yAxis.precision
        });
        return { valueFormatter, xLabelFormatter, yLabelFormatter };
    }

    public static GET_BORDER_VALUES(bins: LayoutBin[]): HistogramBorderValues {
        const borderValues: HistogramBorderValues = {
            minX: Number.MAX_VALUE,
            maxX: -Number.MAX_VALUE,
            minY: Number.MAX_VALUE,
            maxY: -Number.MAX_VALUE
        };

        bins.forEach((dataPoint: LayoutBin) => {
            let minX: number = Number.MAX_VALUE,
                maxX: number = -Number.MAX_VALUE;

            dataPoint.forEach((x: number) => {
                if (x > maxX) {
                    maxX = x;
                }

                if (x < minX) {
                    minX = x;
                }
            });

            if (minX < borderValues.minX) {
                borderValues.minX = minX;
            }

            if (maxX > borderValues.maxX) {
                borderValues.maxX = maxX;
            }

            if (dataPoint.y < borderValues.minY) {
                borderValues.minY = dataPoint.y;
            }

            if (dataPoint.y > borderValues.maxY) {
                borderValues.maxY = dataPoint.y;
            }
        });

        return borderValues;
    }

    public static GET_CORRECT_X_AXIS_VALUE(value: number): number {
        if (value === undefined || isNaN(value)) {
            return 0;
        }

        return Math.max(
            Math.min(value, Default.MaxXAxisEndValue),
            Default.MinXAxisStartValue);
    }

    public static GET_CORRECT_Y_AXIS_VALUE(value: number): number {
        if (value === undefined || isNaN(value)) {
            return 0;
        }

        return Math.max(
            Math.min(value, Default.MaxXAxisEndValue),
            0);
    }

    public static ARE_VALUES_NUMBERS(categoryColumn: DataViewCategoryColumn): boolean {
        return categoryColumn
            && categoryColumn.source
            && (categoryColumn.source.type.numeric || categoryColumn.source.type.integer);
    }

    private static getValuesByFrequencies(
        visualHost: IVisualHost,
        categoryColumn: DataViewCategoryColumn,
        sourceValues: number[],
        frequencies: number[]
    ): HistogramValue[] {

        const values: HistogramValue[] = [],
            queryName: string = Visual.getCategoryColumnQuery(categoryColumn);

        sourceValues.forEach((item: number, index: number) => {
            let frequency: number = Default.Frequency,
                value: number = Number(item),
                selectionId: ISelectionId;

            value = isNaN(value)
                ? Default.Value
                : value;

            selectionId = visualHost.createSelectionIdBuilder()
                .withCategory(categoryColumn, index)
                .withMeasure(queryName)
                .createSelectionId();

            if (frequencies
                && frequencies[index]
                && !isNaN(frequencies[index])
                && frequencies[index] > Default.MinFrequencyNumber
            ) {
                frequency = frequencies[index];
            }

            values.push({
                value,
                frequency,
                selectionId
            });
        });

        return values;
    }

    private static getCategoryColumnQuery(categoryColumn: DataViewCategoryColumn): string {
        return categoryColumn && categoryColumn.source
            ? categoryColumn.source.queryName
            : undefined;
    }

    private static getDataPoints(
        values: HistogramValue[],
        bins: LayoutBin[],
        settings: HistogramSettings,
        yValueFormatter: IValueFormatter,
        xValueFormatter: IValueFormatter,
        localizationManager: ILocalizationManager
    ): HistogramDataPoint[] {

        let fontSizeInPx: string = PixelConverter.fromPoint(settings.labels.fontSize);

        return bins.map((bin: any, index: number): HistogramDataPoint => {
            bin.range = [bin.x0, bin.x1];

            bin.tooltipInfo = Visual.getTooltipData(
                bin.y,
                bin.range,
                settings,
                index === 0,
                yValueFormatter,
                xValueFormatter,
                localizationManager);

            bin.subDataPoints = Visual.getSubDataPoints(values, bin, index);

            bin.labelFontSize = fontSizeInPx;

            return bin;
        });
    }

    private static getTooltipData(
        value: number,
        range: number[],
        settings: HistogramSettings,
        includeLeftBorder: boolean,
        yValueFormatter: IValueFormatter,
        xValueFormatter: IValueFormatter,
        localizationManager: ILocalizationManager
    ): VisualTooltipDataItem[] {
        return [
            {
                displayName: Visual.getLegendText(settings, localizationManager),
                value: yValueFormatter.format(value)
            }, {
                displayName: localizationManager.getDisplayName("Visual_TooltipDisplayName"),
                value: Visual.rangeToString(range, includeLeftBorder, xValueFormatter)
            }
        ];
    }

    private static rangeToString(
        range: number[],
        includeLeftBorder: boolean,
        valueFormatter: IValueFormatter
    ): string {
        const rightBracket: string = Default.IncludeBrackets.right;
        const leftBorder: string = valueFormatter.format(range[0]);
        const rightBorder: string = valueFormatter.format(range[1]);

        const leftBracket = includeLeftBorder
            ? Default.IncludeBrackets.left
            : Default.ExcludeBrackets.left;

        return `${leftBracket}${leftBorder}${Default.SeparatorNumbers}${rightBorder}${rightBracket}`;
    }

    private static getSubDataPoints(
        values: HistogramValue[],
        bin: HistogramDataPoint,
        index: number
    ): HistogramSubDataPoint[] {
        const dataPoints: SelectableDataPoint[] = [];

        values.forEach((value: HistogramValue) => {
            if (Visual.isValueContainedInRange(value, bin, index)) {
                dataPoints.push({
                    identity: value.selectionId,
                    selected: false
                });
            }
        });

        return dataPoints;
    }

    private static isValueContainedInRange(
        value: HistogramValue,
        bin: LayoutBin,
        index: number
    ): boolean {
        return ((index === 0 && value.value >= bin.x0) || (value.value > bin.x0))
            && value.value <= bin.x0 + (bin.x1 - bin.x0);
    }

    private static parseSettings(
        dataView: DataView,
        colorHelper: ColorHelper,
    ): HistogramSettings {
        const settings: HistogramSettings = HistogramSettings.parse<HistogramSettings>(dataView);
        const displayName: string = (dataView
            && dataView.metadata
            && dataView.metadata.columns
            && dataView.metadata.columns[0]
            && dataView.metadata.columns[0].displayName
        ) || null;

        let bins: number = Math.round(settings.general.bins);
        let binSize: number = Visual.roundTo(settings.general.binSize, 2);

        if (displayName) {
            settings.general.displayName = displayName;
        }

        if (isNaN(bins) || bins < HistogramGeneralSettings.MinNumberOfBins) {
            bins = HistogramGeneralSettings.DefaultBins;
        } else if (bins > HistogramGeneralSettings.MaxNumberOfBins) {
            bins = HistogramGeneralSettings.MaxNumberOfBins;
        }

        settings.general.bins = bins;
        settings.general.binSize = binSize;

        settings.dataPoint.fill = colorHelper.getHighContrastColor("foreground", settings.dataPoint.fill);

        settings.xAxis.precision = Visual.getPrecision(settings.xAxis.precision);
        settings.xAxis.axisColor = colorHelper.getHighContrastColor("foreground", settings.xAxis.axisColor);
        settings.xAxis.strokeColor = colorHelper.getHighContrastColor("foreground", settings.xAxis.strokeColor);

        settings.yAxis.precision = Visual.getPrecision(settings.yAxis.precision);
        settings.yAxis.axisColor = colorHelper.getHighContrastColor("foreground", settings.yAxis.axisColor);
        settings.yAxis.strokeColor = colorHelper.getHighContrastColor("foreground", settings.yAxis.strokeColor);

        settings.labels.precision = Visual.getPrecision(settings.labels.precision);
        settings.labels.color = colorHelper.getHighContrastColor("foreground", settings.labels.color);

        settings.general.displayName = Visual.GET_LEGEND_TEXT_WITH_UNITS(
            settings.general.displayName,
            settings.xAxis.style,
            settings.xAxis.displayUnits
        );

        return settings;
    }

    private static getPrecision(precision: number): number {
        return Math.min(
            Math.max(precision, Default.MinPrecision),
            Default.MaxPrecision
        );
    }

    private static getLegendsData(
        settings: HistogramSettings,
        viewport: IViewport,
        viewportIn: IViewport,
        localizationManager: ILocalizationManager
    ): ILegend[] {

        const xLegendText: string = Visual.GET_LEGEND_TEXT_WITH_UNITS(
                Visual.getLegendText(settings, localizationManager),
                settings.yAxis.style,
                settings.yAxis.displayUnits
            ),
            yLegendText: string = settings.general.displayName,
            yTitleMargin = Visual.shouldShowYOnRight(settings)
                ? viewport.width - Default.YTitleMargin + Visual.getLegendSize(settings.yAxis)
                : Default.MinYTitleMargin;

        return [
            {
                transform: translate(
                    viewport.width / Default.MiddleFactor,
                    viewport.height),
                text: Visual.getTailoredTextOrDefault(
                    yLegendText,
                    viewportIn.width),
                dx: Default.SvgXAxisDx,
                dy: Default.SvgXAxisDy,
                color: settings.xAxis.axisColor,
            }, {
                transform: translateAndRotate(
                    Visual.shouldShowYOnRight(settings)
                        ? yTitleMargin
                        : Default.SvgPosition,
                    viewport.height / Default.MiddleFactor,
                    Default.SvgPosition,
                    Default.SvgPosition,
                    Default.SvgAngle),
                text: Visual.getTailoredTextOrDefault(
                    xLegendText,
                    viewportIn.height),
                dx: Default.SvgYAxisDx,
                color: settings.yAxis.axisColor,
            }
        ];
    }

    public static GET_LEGEND_TEXT_WITH_UNITS(title: string, style: HistogramAxisStyle, displayUnit: number): string {
        const formatter: IValueFormatter = ValueFormatter.create({ value: displayUnit }); // REVIEW

        switch (style) {
            case HistogramAxisStyle.showTitleOnly: {
                return title;
            }
            case HistogramAxisStyle.showUnitOnly: {
                return !(displayUnit === 0 || displayUnit === 1) && formatter.displayUnit
                    ? formatter.displayUnit.title
                    : title;
            }
            case HistogramAxisStyle.showBoth: {
                return !(displayUnit === 0 || displayUnit === 1) && formatter.displayUnit
                    ? `${title} (${formatter.displayUnit.title})`
                    : title;
            }
        }

        return undefined;
    }

    private static getLegendSize = (
        axisSettings: HistogramAxisSettings
    ): number => (
        axisSettings.title
        ? Default.LegendSizeWhenTitleIsActive
        : Default.LegendSizeWhenTitleIsNotActive
    )

    private static getLegendText = (
        settings: HistogramSettings,
        localizationManager: ILocalizationManager
    ): string => (
        settings.general.frequency
        ? localizationManager.getDisplayName("Visual_Frequency")
        : localizationManager.getDisplayName("Visual_Density")
    )

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        const settings: HistogramSettings = this.data && this.data.settings
            ? this.data.settings
            : <HistogramSettings>HistogramSettings.getDefault();

        if (!this.data.settings.general.isBinSizeEnabled) {
            delete this.data.settings.general.binSize;
        }

        return HistogramSettings.enumerateObjectInstances(settings, options);
    }

    public isDataValid(data: HistogramData): boolean {
        if (!data
            || !data.dataPoints
            || data.dataPoints.length === Default.MinAmountOfDataPoints) {
            return false;
        }

        return !data.dataPoints.some((dataPoint: HistogramDataPoint) => {
            return dataPoint.range.some((rangeValue: number) => {
                return isNaN(rangeValue)
                    || rangeValue === Infinity
                    || rangeValue === -Infinity;
            });
        });
    }

    public update(options: VisualUpdateOptions): void {
        let dataView = options.dataViews[0];
        if (!dataView
            || !dataView.categorical
            || !dataView.categorical.categories
            || !dataView.categorical.categories[0]
            || !dataView.categorical.categories[0].values
            || !(dataView.categorical.categories[0].values.length > 0)
        ) {
            return null;
        }

        try {
            this.events.renderingStarted(options);

            const dataView: DataView = options.dataViews[0];

            this.setViewportSize(options.viewport);

            this.updateElements(
                Math.max(options.viewport.height, Default.MinViewportSize),
                Math.max(options.viewport.width, Default.MinViewportSize));

            this.data = Visual.CONVERTER(
                dataView,
                this.visualHost,
                this.localizationManager,
                this.colorHelper
            );

            if (!this.isDataValid(this.data)) {
                this.clear();
                return;
            }   

            const propertiesToPersist: IPaneProperties = {
                binsCount: this.data.settings.general.bins,
                binSize: this.data.settings.general.binSize,
                isBinSizeEnabled: this.data.settings.general.isBinSizeEnabled,
            }
            
            this.persistProperties(propertiesToPersist);
            this.updateViewportIn();

            // update Axes
            const maxWidthOfVerticalAxisLabel = Visual.getWidthOfLabel(
                this.data.borderValues.maxY,
                this.data.yLabelFormatter),
            maxWidthOfHorizontalAxisLabel = Visual.getWidthOfLabel(
                this.data.borderValues.maxX,
                this.data.xLabelFormatter),
            maxHeightOfVerticalAxisLabel = Visual.getHeightOfLabel(
                this.data.borderValues.maxX,
                this.data.xLabelFormatter),
            ySource = dataView.categorical.values &&
                dataView.categorical.values[0] &&
                dataView.categorical.values[0].values
                ? dataView.categorical.values[0].source
                : dataView.categorical.categories[0].source,
            xSource = dataView.categorical.categories[0].source;

            this.createScales();

            this.yAxisProperties = this.calculateYAxes(ySource, maxHeightOfVerticalAxisLabel);
            this.renderYAxis();

            this.updateViewportIn(maxWidthOfVerticalAxisLabel);
            this.createScales();

            this.xAxisProperties = this.calculateXAxes(xSource, maxWidthOfHorizontalAxisLabel, false);
            this.renderXAxis();

            this.columnsAndAxesTransform(maxWidthOfVerticalAxisLabel);

            this.createScales();
            this.applySelectionStateToData();

            // render
            const columnsSelection: Selection<any> = this.renderColumns();

            this.tooltipServiceWrapper.addTooltip(
                columnsSelection,
                (eventArgs: TooltipEventArgs<HistogramDataPoint>) => eventArgs.data.tooltipInfo
            );

            this.bindSelectionHandler(columnsSelection);

            this.renderLegend();

            this.renderLabels();

            this.events.renderingFinished(options);
        }
        catch (e) {
            console.error(e);
            this.events.renderingFailed(options);
        }
    }

    public destroy(): void {
        this.root = null;
    }

    private persistProperties(properties: IPaneProperties) {
        const objectToPersist: powerbi.VisualObjectInstancesToPersist = {
            replace: [
                {
                    objectName: "general",
                    selector: undefined,
                    properties: {
                        bins: properties.binsCount,
                        isBinSizeEnabled: properties.isBinSizeEnabled,
                        binSize: properties.binSize
                    }
                }]
        };
        
        this.visualHost.persistProperties(objectToPersist);
    }

    private applySelectionStateToData(): void {
        if (this.interactivityService) {
            this.data.dataPoints.forEach((dataPoint: HistogramDataPoint) => {
                this.interactivityService.applySelectionStateToData(dataPoint.subDataPoints);
            });
        }
    }

    private setViewportSize(viewport: IViewport): void {
        const height = viewport.height - Default.SvgMargin.top - Default.SvgMargin.bottom;
        const width = viewport.width - Default.SvgMargin.left - Default.SvgMargin.right;

        this.viewport = {
            height: Math.max(height, Default.MinViewportSize),
            width: Math.max(width, Default.MinViewportSize)
        };
    }

    private updateViewportIn(maxWidthOfVerticalAxisLabel: number = 0): void {
        const width: number = this.viewport.width - this.data.yLegendSize - maxWidthOfVerticalAxisLabel,
            height: number = this.viewport.height - this.data.xLegendSize;

        this.viewportIn = {
            height: Math.max(height, Default.MinViewportInSize),
            width: Math.max(width, Default.MinViewportInSize)
        };
    }

    private updateElements(height: number, width: number): void {
        const transform: string = translate(
            Default.SvgMargin.left,
            Default.SvgMargin.top);

        this.root
            .attr("height", height)
            .attr("width", width);

        this.main.attr("transform", transform);
        this.legend.attr("transform", transform);
    }

    private createScales(): void {
        const yAxisSettings: HistogramYAxisSettings = this.data.settings.yAxis,
            xAxisSettings: HistogramXAxisSettings = this.data.settings.xAxis,
            borderValues: HistogramBorderValues = this.data.borderValues;

        this.data.xScale = scaleLinear()
            .domain([
                this.data.xCorrectedMin !== null ? this.data.xCorrectedMin : xAxisSettings.start,
                this.data.xCorrectedMax !== null ? this.data.xCorrectedMax : xAxisSettings.end
            ])
            .range([
                0,
                this.viewportIn.width
            ]);

        this.data.yScale = scaleLinear()
            .domain([
                yAxisSettings.start,
                yAxisSettings.end
            ])
            .range([
                this.viewportIn.height,
                this.outerPadding
            ]);
    }

    private columnsAndAxesTransform(labelWidth: number): void {
        const settings: HistogramSettings = this.data.settings;
        const { width, height } = <IViewport>this.viewportIn;

        const offsetToRight: number = Visual.shouldShowYOnRight(settings)
            ? Default.SvgMargin.left
            : settings.yAxis.title
                ? Default.SvgMargin.left + labelWidth + Default.YAxisMargin
                : Default.SvgMargin.left + labelWidth;

        const offsetToRightStr = translate(
            offsetToRight + Default.ColumnAndLabelOffset,
            Default.SvgPosition
        );

        this.columns.attr("transform", offsetToRightStr);
        this.labelGraphicsContext.attr("transform", offsetToRightStr);

        this.axes.attr("transform", translate(
            offsetToRight,
            Default.SvgPosition)
        );

        this.axisY.attr("transform", translate(
            Visual.shouldShowYOnRight(settings)
                ? width
                : Default.SvgPosition,
                Default.SvgPosition)
        );

        this.axisX.attr("transform", translate(
            Default.SvgPosition,
            height)
        );
    }

    private bindSelectionHandler(columnsSelection: Selection<HistogramDataPoint>): void {
        if (!this.interactivityService
            || !this.data
            || !this.data.dataPoints
        ) {
            return;
        }
        let subDataPoints: SelectableDataPoint[] = [];

        this.data.dataPoints.forEach((dataPoint: HistogramDataPoint) => {
            subDataPoints = subDataPoints.concat(dataPoint.subDataPoints);
        });

        const behaviorOptions: HistogramBehaviorOptions = {
            dataPoints: subDataPoints,
            columns: columnsSelection,
            clearCatcher: this.clearCatcher,
            interactivityService: this.interactivityService,
            behavior: this.behavior
        };

        this.interactivityService.bind(behaviorOptions);
    }

    private renderColumns(): Selection<HistogramDataPoint> {
        const { start, end } = this.data.settings.xAxis,
            bottomBorder = this.data.settings.yAxis.start,
            data: HistogramDataPoint[] = this.data.dataPoints,
            xScale: LinearScale<any, any> = this.data.xScale,
            yScale: LinearScale<any, any> = this.data.yScale,
            columnsSelection: Selection<any> = this.columnsSelection.data(data);

        let updateColumnsSelection = columnsSelection
            .enter()
            .append("svg:rect")
            .classed(Visual.Column.className, true);

        this.columnWidth = this.getColumnWidth(this.strokeWidth);

        const getColumnHeight = (column: LayoutBin): number =>
            Math.max(
                this.viewportIn.height - yScale(column.y),
                Default.MinColumnHeight
            ),
        interval: number = data[0].x1 - data[0].x0;

        const isOutOfXBorders = (dataPoint: HistogramDataPoint): boolean =>
            (dataPoint.x0 <= start - interval) || (dataPoint.x1 >= end + interval);

        const isUnderYBottomBorder = (dataPoint: HistogramDataPoint): boolean =>
            (yScale(dataPoint.y) > yScale(bottomBorder));

        const getColumnFillColor = (dataPoint: HistogramDataPoint, index: number) =>
            this.colorHelper.isHighContrast
            ? null
            : ((index % 2) ? this.data.settings.dataPoint.fill : this.data.settings.dataPoint.fillEven);

        columnsSelection
            .merge(updateColumnsSelection)
            .attr("x", (dataPoint: HistogramDataPoint) => xScale(dataPoint.x0))
            .attr("y", (dataPoint: HistogramDataPoint) => yScale(dataPoint.y))
            .attr("width", this.columnWidth)
            .attr("height", (dataPoint: HistogramDataPoint) => getColumnHeight(dataPoint))

            .style("fill", (dataPoint: HistogramDataPoint, index: number) => getColumnFillColor(dataPoint, index))
            .style("stroke", this.colorHelper.isHighContrast ? this.data.settings.dataPoint.fill : null)
            .style("stroke-width", PixelConverter.toString(this.strokeWidth))

            .style("display", (dataPoint: HistogramDataPoint) =>
                isOutOfXBorders(dataPoint) || isUnderYBottomBorder(dataPoint)
                ? "none"
                : null
            );

        updateOpacity(
            columnsSelection.merge(updateColumnsSelection),
            this.interactivityService,
            false
        );

        columnsSelection
            .exit()
            .remove();

        return columnsSelection.merge(updateColumnsSelection);
    }

    private getColumnWidth(strokeWidth: number): number {
        const countOfValues: number = this.data.dataPoints.length;
        const borderValues: HistogramBorderValues = this.data.borderValues;

        const firstDataPoint: number = this.data.xCorrectedMin
            ? this.data.xCorrectedMin
            : borderValues.minX;

        const widthOfColumn = countOfValues
            ? this.data.xScale(
                firstDataPoint + (this.data.dataPoints[0].x1 - this.data.dataPoints[0].x0)
            ) - Default.ColumnPadding - strokeWidth
            : Default.MinViewportInSize;

        return Math.max(widthOfColumn, Default.MinViewportInSize);
    }

    private renderLegend(): void {
        const legendsData: ILegend[] = Visual.getLegendsData(
            this.data.settings,
            this.viewport,
            this.viewportIn,
            this.localizationManager
        );

        let legendSelection: Selection<ILegend> = this.legendSelection.data(legendsData);

        let updateLegendSelection = legendSelection
            .enter()
            .append("svg:text");

        legendSelection
            .merge(updateLegendSelection)
            .attr("x", Default.SvgLegendPosition)
            .attr("y", Default.SvgLegendPosition)
            .attr("dx", (legend: ILegend) => legend.dx)
            .attr("dy", (legend: ILegend) => legend.dy)
            .attr("transform", (legend: ILegend) => legend.transform)
            .style("fill", (legend: ILegend) => legend.color)
            .text((item: ILegend) => item.text)
            .classed(Visual.Legend.className, true);

        legendSelection
            .exit()
            .remove();

        const getDisplayForAxisTitle = (axisSettings: HistogramAxisSettings): string =>
            (axisSettings && axisSettings.title) ? null : "none";

        this.legend
            .select("text")
            .style("display", getDisplayForAxisTitle(this.data.settings.xAxis));

        this.legend
            .selectAll("text")
            .filter((d, index: number) => index === 1)
            .style("display", getDisplayForAxisTitle(this.data.settings.yAxis));
    }

    private renderLabels(): void {
        let labelSettings: HistogramLabelSettings = this.data.settings.labels,
            dataPointsArray: HistogramDataPoint[] = this.data.dataPoints,
            labels: Selection<HistogramDataPoint>;
        if (!labelSettings.show) {
            dataLabelUtils.cleanDataLabels(this.labelGraphicsContext);
            return;
        }

        labels = dataLabelUtils.drawDefaultLabelsForDataPointChart(
            dataPointsArray,
            this.labelGraphicsContext,
            this.getLabelLayout(),
            this.viewportIn
        );

        if (labels) {
            labels.attr("transform", (dataPoint: HistogramDataPoint) => {
                let size: ISize = dataPoint.size,
                    dx: number,
                    dy: number;

                dx = size.width / Default.DataLabelXOffset ;
                dy = size.height / Default.DataLabelYOffset;

                return translate(dx, dy);
            });
        }
    }

    private getLabelLayout(): ILabelLayout {
        let labelSettings: HistogramLabelSettings = this.data.settings.labels,
            xScale: LinearScale<any, any> = this.data.xScale,
            yScale: LinearScale<any, any> = this.data.yScale,
            fontSizeInPx: string = PixelConverter.fromPoint(labelSettings.fontSize),
            fontFamily: string = dataLabelUtils.LabelTextProperties.fontFamily,
            dataLabelFormatter: IValueFormatter = ValueFormatter.create({
                value: labelSettings.displayUnits,
                precision: labelSettings.precision
            });

        return {
            labelText: (dataPoint: HistogramDataPoint) => {
                return dataLabelFormatter.format(dataPoint.y).toString();
            },
            labelLayout: {
                x: (dataPoint: HistogramDataPoint) => {
                    let x: number,
                        dx: number;

                    x = xScale(dataPoint.x0);
                    dx = dataPoint.size.width / Default.DataLabelXOffset
                        - this.columnWidth / Default.MiddleFactor;

                    return x - dx;
                },
                y: (dataPoint: HistogramDataPoint) => {
                    let y: number,
                        dy: number,
                        delta: number;

                    y = yScale(dataPoint.y);
                    dy = dataPoint.size.height;
                    delta = y - dy;

                    return delta < 0 ? y + dy / 2 : delta;
                }
            },
            filter: (dataPoint: HistogramDataPoint) => {
                return dataPoint != null;
            },
            style: {
                "fill": labelSettings.color,
                "font-size": fontSizeInPx,
                "font-family": fontFamily
            }
        };
    }

    private static getWidthOfLabel(
        labelValue: number | string,
        valueFormatter: IValueFormatter
    ): number {
        const textProperties: TextProperties =
            Visual.getTextPropertiesForMeasurement(labelValue, valueFormatter);

        return textMeasurementService.measureSvgTextWidth(textProperties) + Default.AdditionalWidthOfLabel;
    }

    private static getHeightOfLabel(
        labelValue: number | string,
        valueFormatter: IValueFormatter
    ): number {
        const textProperties: TextProperties =
            Visual.getTextPropertiesForMeasurement(labelValue, valueFormatter);

        return textMeasurementService.measureSvgTextHeight(textProperties) + Default.AdditionalHeightOfLabel;
    }

    private static getTextPropertiesForMeasurement(
        labelValue: string | number,
        valueFormatter?: IValueFormatter
    ): TextProperties {
        let labelText: string;

        if (valueFormatter) {
            labelText = valueFormatter.format(labelValue);
        } else {
            labelText = <string>labelValue;
        }

        return {
            ...Default.TextProperties,
            text: labelText
        };
    }

    private calculateYAxes(
        metaDataColumn: DataViewMetadataColumn,
        minOrdinalRectThickness: number
    ): IAxisProperties {
        let yAxisSettings: HistogramYAxisSettings = this.data.settings.yAxis,
            formatString: string = (this.data.settings.general.frequency)
                ? ValueFormatter.getFormatStringByColumn(metaDataColumn)
                : undefined;

        return HistogramAxisHelper.createAxis({
            onRight: Visual.shouldShowYOnRight(this.data.settings),
            pixelSpan: this.viewportIn.height,
            dataDomain: [yAxisSettings.start, yAxisSettings.end],
            metaDataColumn,
            formatString: formatString,
            outerPadding: this.outerPadding,
            isScalar: true,
            isVertical: true,
            useTickIntervalForDisplayUnits: true,
            isCategoryAxis: false,
            getValueFn: (index: number) => index,
            scaleType: axisScale.linear,
            innerPaddingRatio: Default.InnerPaddingRatio,
            minOrdinalRectThickness: minOrdinalRectThickness,
            tickLabelPadding: undefined,
            is100Pct: true
        });
    }

    private renderYAxis(): void {
        const yAxisSettings: HistogramYAxisSettings = this.data.settings.yAxis;

        if (!yAxisSettings.show) {
            this.clearElement(this.axisY);
            return;
        }

        const yAxis: Axis<number | { valueOf(): number }> =
            (Visual.shouldShowYOnRight(this.data.settings) ? d3.axisRight : d3.axisLeft)
            (this.data.yScale)
            .tickFormat((item: number) => {
                return this.data.yLabelFormatter.format(item);
            });

        yAxis(this.axisY);
        this.axisY
            .style("fill", yAxisSettings.axisColor)
            .style("stroke", yAxisSettings.strokeColor)
            .attr("text-anchor", Visual.shouldShowYOnRight(this.data.settings) ? "start": "end") // d3 updates the anchor for entered elements only
    }

    private renderXAxis(): void {
        const xAxisSettings: HistogramXAxisSettings = this.data.settings.xAxis;

        if (!xAxisSettings.show) {
            this.clearElement(this.axisX);
            return;
        }

        const amountOfLabels: number = this.xAxisProperties.values.length || Default.MinLabelNumber;

        const xAxis: Axis<number | { valueOf(): number; }> = this.xAxisProperties.axis
            .tickValues(this.xAxisProperties.dataDomain)
            .tickFormat(<any>(
                (value: number, index: number) => this.xAxisTicksFormatter(value, index, amountOfLabels)
            )); // We cast this function to any, because the type definition doesn't contain the second argument

        this.axisX.call( xAxis );
        this.axisX
            .style("fill", xAxisSettings.axisColor)
            .style("stroke", xAxisSettings.strokeColor);
    }

    private xAxisTicksFormatter(
        value: number,
        index: number,
        amount: number
    ): string {
        const formattedLabel: string = this.data.xLabelFormatter.format(value);

        if (index === 0 || index === amount - 1) {
            const maxWidthOfTheLatestLabel: number = Math.min(
                this.viewportIn.width,
                Default.MaxWidthOfTheLatestLabel
            );

            return Visual.getTailoredTextOrDefault(
                formattedLabel,
                maxWidthOfTheLatestLabel
            );
        }

        return formattedLabel;
    }

    public calculateXAxes(
        metaDataColumn: DataViewMetadataColumn,
        widthOfLabel: number,
        scrollbarVisible: boolean
    ): IAxisProperties {
        let axes: IAxisProperties,
            width: number = this.viewportIn.width,
            xPoints: number[] = this.getXPoints();

        axes = HistogramAxisHelper.createAxis({
            onRight: Visual.shouldShowYOnRight(this.data.settings),
            pixelSpan: this.viewportIn.width,
            dataDomain: xPoints,
            metaDataColumn,
            formatString: ValueFormatter.getFormatStringByColumn(metaDataColumn),
            outerPadding: Default.SvgOuterPadding,
            isScalar: false,
            isVertical: false,
            useTickIntervalForDisplayUnits: true,
            isCategoryAxis: true,
            getValueFn: (index, valueType) => index,
            scaleType: axisScale.linear,
            innerPaddingRatio: Default.InnerPaddingRatio,
            minOrdinalRectThickness: widthOfLabel,
            tickLabelPadding: undefined
        });

        axes.axisLabel = this.data.settings.general.displayName;

        axes.willLabelsFit = willLabelsFit(
            axes,
            width,
            textMeasurementService.measureSvgTextWidth,
            Default.TextProperties
        );

        // If labels do not fit and we are not scrolling, try word breaking
        axes.willLabelsWordBreak = (!axes.willLabelsFit && !scrollbarVisible) && willLabelsWordBreak(
            axes, Default.SvgMargin, width, textMeasurementService.measureSvgTextWidth,
            textMeasurementService.estimateSvgTextHeight, textMeasurementService.getTailoredTextOrDefault,
            Default.TextProperties
        );

        return axes;
    }

    private getXPoints(): number[] {
        const { start, end } = this.data.settings.xAxis,
            { minX, maxX } = this.data.borderValues,
            { dataPoints } = this.data,
            interval: number = this.data.dataPoints[0].x1 - this.data.dataPoints[0].x0;
        let xPoints: number[],
            tmpStart: number,
            tmpEnd: number,
            tmpArr: number[],
            closerLimit: number;

        xPoints = dataPoints.reduce(
            (previousValue: number[], currentValue: HistogramDataPoint, index: number) =>
                previousValue.concat((index === 0)
                ? currentValue.range
                : currentValue.range.slice(1)),
            []
        );

        // It is necessary to find out interval to calculate all necessary points before and after offset (if start and end for X axis was changed by user)
        if ((maxX !== end || minX !== start) && xPoints.length > 1) {

            // The interval must be greater than zero to avoid infinity loops
            if (Visual.isIntervalValid(interval)) {
                // If start point is greater than min border, it is necessary to remove non-using data points
                if (start > minX) {
                    closerLimit = this.findBorderMinCloserToXAxisStart(minX, start, interval);
                    xPoints = xPoints.filter(dpv => this.formatXLabelsForFiltering(dpv) >= closerLimit);
                    this.data.xCorrectedMin = xPoints && xPoints.length > 0 ? xPoints[0] : null;
                }
                else {
                    // Add points before
                    tmpArr = [];
                    tmpStart = minX;
                    while (start < tmpStart) {
                        tmpStart = tmpStart - interval;
                        tmpArr.push(tmpStart);
                        this.data.xCorrectedMin = tmpStart;
                    }
                    tmpArr.reverse();
                    xPoints = tmpArr.concat(xPoints);
                }

                // If end point is lesser than max border, it is necessary to remove non-using data points
                if (end < maxX) {
                    closerLimit = this.findBorderMaxCloserToXAxisEnd(maxX, end, interval);
                    xPoints = xPoints.filter(dpv => this.formatXLabelsForFiltering(dpv) <= closerLimit);
                    this.data.xCorrectedMax = xPoints && xPoints.length > 0 ? xPoints[xPoints.length - 1] : null;
                }
                else {
                    // Add points after
                    tmpEnd = maxX;
                    while (end > tmpEnd) {
                        tmpEnd = tmpEnd + interval;
                        xPoints.push(tmpEnd);
                        this.data.xCorrectedMax = tmpEnd;
                    }
                }
            }
        }

        return xPoints;
    }

    /// Using in case when xAxis start (set in options) is greater than calculated border min.
    /// This function detect the closest point to xAxis start (set in options).
    /// Each iteration tries to shift border limit right corresponding to interval
    /// and be closer to xAxis start at the same time.
    private findBorderMinCloserToXAxisStart(
        currentBorderMin: number,
        xAxisStart: number,
        interval: number
    ): number {
        while (currentBorderMin < xAxisStart && xAxisStart >= currentBorderMin + interval) {
            currentBorderMin += interval;
        }

        return this.formatXLabelsForFiltering(currentBorderMin);
    }

    /// Using in case when xAxis end (set in options) is lesser than calculated border max.
    /// This function detect the closest point to xAxis end (set in options).
    /// Each iteration tries to shift border limit left corresponding to interval
    /// and be closer to xAxis end at the same time.
    private findBorderMaxCloserToXAxisEnd(
        currentBorderMax: number,
        xAxisEnd: number,
        interval: number
    ): number {
        while (currentBorderMax > xAxisEnd && xAxisEnd <= currentBorderMax - interval) {
            currentBorderMax -= interval;
        }
        return this.formatXLabelsForFiltering(currentBorderMax);
    }

    private clear(): void {
        [
            this.axisX,
            this.axisY,
            this.legend,
            this.columns,
            this.labelGraphicsContext
        ].forEach((selection: Selection<any>) => {
            this.clearElement(selection);
        });
    }

    public static isIntervalValid = (interval: number): boolean => (interval > 0);

    public static shouldShowYOnRight = (settings: HistogramSettings): boolean => (
        settings.yAxis.position === HistogramPositionType.Right
    )

    private clearElement(selection: Selection<any>): void {
        selection
            .selectAll("*")
            .remove();
    }

    private formatXLabelsForFiltering(
        nonFormattedPoint: number
    ): number {
        let formattedPoint: string = this.data.xLabelFormatter.format(nonFormattedPoint);
        return parseFloat(formattedPoint);
    }

    private static getTailoredTextOrDefault = (
        text: string,
        maxWidth: number
    ): string =>
        textMeasurementService.getTailoredTextOrDefault(
            { ...Default.TextProperties, text },
            maxWidth
        )
}
