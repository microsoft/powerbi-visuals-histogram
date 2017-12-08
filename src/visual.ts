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

module powerbi.extensibility.visual {
    // d3
    import SVGAxis = d3.svg.Axis;
    import Selection = d3.Selection;
    import LinearScale = d3.scale.Linear;
    import LayoutBin = d3.layout.histogram.Bin;
    import UpdateSelection = d3.selection.Update;
    import HistogramLayout = d3.layout.Histogram;

    // powerbi
    import Fill = powerbi.Fill;
    import DataView = powerbi.DataView;
    import IViewport = powerbi.IViewport;
    import DataViewObjects = powerbi.DataViewObjects;
    import VisualObjectInstance = powerbi.VisualObjectInstance;
    import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
    import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
    import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
    import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;
    import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;

    // powerbi.extensibility
    import IVisual = powerbi.extensibility.IVisual;

    // powerbi.extensibility.visual
    import ISelectionId = powerbi.visuals.ISelectionId;
    import IVisualHost = powerbi.extensibility.visual.IVisualHost;
    import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
    import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

    // powerbi.extensibility.utils.type
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;

    // powerbi.extensibility.utils.svg
    import IMargin = powerbi.extensibility.utils.svg.IMargin;
    import ISize = powerbi.extensibility.utils.svg.shapes.ISize;
    import translate = powerbi.extensibility.utils.svg.translate;
    import translateAndRotate = powerbi.extensibility.utils.svg.translateAndRotate;
    import ClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.ClassAndSelector;
    import createClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.createClassAndSelector;

    // powerbi.extensibility.utils.formatting
    import ValueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;

    // powerbi.extensibility.utils.color
    import ColorHelper = powerbi.extensibility.utils.color.ColorHelper;

    // powerbi.extensibility.utils.chart
    import axisScale = powerbi.extensibility.utils.chart.axis.scale;
    import dataLabelUtils = powerbi.extensibility.utils.chart.dataLabel.utils;
    import ILabelLayout = powerbi.extensibility.utils.chart.dataLabel.ILabelLayout;
    import IAxisProperties = powerbi.extensibility.utils.chart.axis.IAxisProperties;
    import willLabelsFit = powerbi.extensibility.utils.chart.axis.LabelLayoutStrategy.willLabelsFit;
    import willLabelsWordBreak = powerbi.extensibility.utils.chart.axis.LabelLayoutStrategy.willLabelsWordBreak;

    // powerbi.extensibility.utils.interactivity
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
    import appendClearCatcher = powerbi.extensibility.utils.interactivity.appendClearCatcher;
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;
    import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;

    // powerbi.extensibility.utils.tooltip
    import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;

    interface HistogramValue {
        value: number;
        selectionId: ISelectionId;
        frequency: number;
    }

    interface Legend {
        text: string;
        transform?: string;
        dx?: string;
        dy?: string;
    }

    interface Brackets {
        left: string;
        right: string;
    }

    enum UpdateColumnsWidthMode {
        markOnly = "markOnly" as any,
        calculatePointsDiff = "calculatePointsDiff" as any,
        standardCalculation = "standardCalculation" as any
    }

    export class Histogram implements IVisual {
        private static ClassName: string = "histogram";
        private static FrequencyText: string = "Frequency";
        private static DensityText: string = "Density";

        private static Axes: ClassAndSelector = createClassAndSelector("axes");
        private static Axis: ClassAndSelector = createClassAndSelector("axis");
        private static XAxis: ClassAndSelector = createClassAndSelector("xAxis");
        private static YAxis: ClassAndSelector = createClassAndSelector("yAxis");

        private static Columns: ClassAndSelector = createClassAndSelector("columns");
        private static Column: ClassAndSelector = createClassAndSelector("column");

        private static Legends: ClassAndSelector = createClassAndSelector("legends");
        private static Legend: ClassAndSelector = createClassAndSelector("legend");

        private static LabelGraphicsContext: ClassAndSelector = createClassAndSelector("labelGraphicsContext");

        private static MinPrecision: number = 0;
        private static MaxPrecision: number = 17; // max number of decimals in float

        public static MinXAxisStartValue: number = -(1e+25);
        public static MaxXAxisEndValue: number = 1e+25;

        private static YTitleMargin: number = 70;
        private static YAxisMargin: number = 20;
        private static MinYTitleMargin: number = 0;

        private static MinViewportSize: number = 100;
        private static MinViewportInSize: number = 0;

        private static MinAmountOfValues: number = 1;
        private static MinAmountOfDataPoints: number = 0;

        private static AdditionalWidthOfLabel: number = 3;
        private static AdditionalHeightOfLabel: number = 3;

        private static LegendSizeWhenTitleIsActive: number = 50;
        private static LegendSizeWhenTitleIsNotActive: number = 25;

        private static InnerPaddingRatio: number = 1;

        private static DataLabelXOffset: number = 2;
        private static DataLabelYOffset: number = 1.8;

        private static ColumnPadding: number = 2.5;
        private static ColumnAndLabelOffset: number = 1.5;

        private static MinColumnHeight: number = 1;

        private static TooltipDisplayName: string = "Range";
        private static SeparatorNumbers: string = ", ";

        private static MaxWidthOfTheLatestLabel: number = 40;

        private static DefaultShiftByValues: number = 0;
        private static DefaultSumFrequency: number = 0;
        private static DefaultFrequency: number = 1;
        private static DefaultValue: number = 0;
        private static DefaultPosition: number = 0;
        private static DefaultLegendPosition: number = 0;
        private static DefaultAngle: number = 270;
        private static DefaultOuterPadding: number = 0;

        private static DefaultXAxisDx: string = "-0.5em";
        private static DefaultXAxisDy: string = "-1em";
        private static DefaultYAxisDx: string = "3em";

        private static MinAmoutOfFrequencies: number = 1;
        private static MinAmountOfLabels: number = 0;

        private static MiddleFactor: number = 2;

        private static ExcludeBrackets: Brackets = {
            left: "(",
            right: ")"
        };

        private static IncludeBrackets: Brackets = {
            left: "[",
            right: "]"
        };

        private static Margin: IMargin = {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
        };

        private static DefaultTextProperties: TextProperties = {
            fontFamily: "helvetica, arial, sans-serif",
            fontSize: PixelConverter.toString(11) // Note: This value and font-size in histogram.less should be the same.
        };

        private widthOfColumn: number = 0;
        private yTitleMargin: number = 0;
        private outerPadding: number = 0;
        private xAxisProperties: IAxisProperties;
        private yAxisProperties: IAxisProperties;

        private viewport: IViewport;
        private viewportIn: IViewport;

        private visualHost: IVisualHost;
        private interactivityService: IInteractivityService;
        private behavior: IInteractiveBehavior;

        private root: d3.Selection<any>;
        private clearCatcher: d3.Selection<any>;
        private main: d3.Selection<any>;
        private axes: d3.Selection<any>;
        private axisX: d3.Selection<any>;
        private axisY: d3.Selection<any>;
        private legend: d3.Selection<any>;
        private columns: d3.Selection<HistogramDataPoint>;
        private labelGraphicsContext: d3.Selection<any>;

        private dataView: HistogramDataView;

        private tooltipServiceWrapper: ITooltipServiceWrapper;

        private get columnsSelection(): d3.Selection<HistogramDataPoint> {
            return this.main.select(Histogram.Columns.selectorName)
                .selectAll(Histogram.Column.selectorName);
        }

        constructor(options: VisualConstructorOptions) {
            this.init(options);
        }

        public init(options: VisualConstructorOptions): void {
            this.visualHost = options.host;

            this.interactivityService = createInteractivityService(this.visualHost);
            this.behavior = HistogramBehavior.create();

            this.tooltipServiceWrapper = createTooltipServiceWrapper(
                options.host.tooltipService,
                options.element);

            this.root = d3.select(options.element)
                .append("svg")
                .classed(Histogram.ClassName, true);

            this.clearCatcher = appendClearCatcher(this.root);

            this.main = this.root.append("g");

            this.columns = this.main
                .append("g")
                .classed(Histogram.Columns.className, true);

            this.axes = this.main
                .append("g")
                .classed(Histogram.Axes.className, true);

            this.axisX = this.axes
                .append("g")
                .classed(Histogram.Axis.className, true)
                .classed(Histogram.XAxis.className, true);

            this.axisY = this.axes
                .append("g")
                .classed(Histogram.Axis.className, true)
                .classed(Histogram.YAxis.className, true);

            this.legend = this.main
                .append("g")
                .classed(Histogram.Legends.className, true);

            this.labelGraphicsContext = this.main
                .append("g")
                .classed(Histogram.LabelGraphicsContext.className, true);
        }

        public static converter(
            dataView: DataView,
            visualHost: IVisualHost): HistogramDataView {

            if (!dataView
                || !dataView.categorical
                || !dataView.categorical.categories
                || !dataView.categorical.categories[0]
                || !dataView.categorical.categories[0].values
                || !(dataView.categorical.categories[0].values.length > 0)) {

                return null;
            }

            let settings: HistogramSettings,
                categoryColumn: DataViewCategoryColumn = dataView.categorical.categories[0],
                histogramLayout: HistogramLayout<number>,
                values: HistogramValue[],
                numericalValues: number[] = [],
                bins: LayoutBin<number>[],
                dataPoints: HistogramDataPoint[],
                valueFormatter: IValueFormatter,
                frequencies: number[] = [],
                shiftByValues: number = Histogram.DefaultShiftByValues,
                sumFrequency: number = Histogram.DefaultSumFrequency,
                xLabelFormatter: IValueFormatter,
                yLabelFormatter: IValueFormatter,
                xLegendSize: number,
                yLegendSize: number,
                borderValues: HistogramBorderValues,
                yAxisSettings: HistogramYAxisSettings,
                xAxisSettings: HistogramXAxisSettings,
                sourceValues: number[] = categoryColumn.values as number[];

            settings = Histogram.parseSettings(dataView);

            if (!settings
                || !Histogram.areValuesNumbers(categoryColumn)
                || sourceValues.length < Histogram.MinAmountOfValues) {

                return null;
            }

            xLegendSize = Histogram.getLegendSize(settings.xAxis);
            yLegendSize = Histogram.getLegendSize(settings.yAxis);

            if (dataView.categorical.values &&
                dataView.categorical.values[0] &&
                dataView.categorical.values[0].values) {
                frequencies = dataView.categorical.values[0].values as number[];
            }

            values = Histogram.getValuesByFrequencies(
                visualHost,
                categoryColumn,
                sourceValues,
                frequencies);

            values.forEach((value: HistogramValue) => {
                numericalValues.push(value.value);
                sumFrequency += value.frequency;
            });

            histogramLayout = d3.layout.histogram();

            if (settings.general.bins && settings.general.bins > HistogramGeneralSettings.MinNumberOfBins) {
                histogramLayout = histogramLayout.bins(settings.general.bins);
            }

            bins = histogramLayout.frequency(settings.general.frequency)(numericalValues);

            bins.forEach((bin: LayoutBin<number>, index: number) => {
                let filteredValues: HistogramValue[],
                    frequency: number;

                filteredValues = values.filter((value: HistogramValue) => {
                    return Histogram.isValueContainedInRange(value, bin, index);
                });

                frequency = filteredValues.reduce((previousValue: number, currentValue: HistogramValue): number => {
                    return previousValue + currentValue.frequency;
                }, 0);

                bin.y = settings.general.frequency
                    ? frequency
                    : frequency / sumFrequency;

                shiftByValues += bin.length;
            });

            borderValues = Histogram.getBorderValues(bins);

            // min-max for Y axis
            yAxisSettings = settings.yAxis;
            let maxYvalue: number = (yAxisSettings.end !== null) && (yAxisSettings.end > yAxisSettings.start)
                ? yAxisSettings.end
                : borderValues.maxY;
            let minYValue: number = yAxisSettings.start < maxYvalue
                ? yAxisSettings.start
                : 0;
            settings.yAxis.start = Histogram.getCorrectYAxisValue(minYValue);
            settings.yAxis.end = Histogram.getCorrectYAxisValue(maxYvalue);

            // min-max for X axis
            xAxisSettings = settings.xAxis;
            let maxXvalue: number = (xAxisSettings.end !== null) && (xAxisSettings.end > borderValues.minX)
            ? xAxisSettings.end
            : borderValues.maxX;
            let minXValue: number = (xAxisSettings.start !== null) && xAxisSettings.start < maxXvalue
            ? xAxisSettings.start
            : borderValues.minX;
            settings.xAxis.start = Histogram.getCorrectXAxisValue(minXValue);
            settings.xAxis.end = Histogram.getCorrectXAxisValue(maxXvalue);

            if (values.length >= Histogram.MinAmountOfValues) {
                valueFormatter = ValueFormatter.create({
                    format: ValueFormatter.getFormatStringByColumn(dataView.categorical.categories[0].source),
                    value: values[0].value,
                    value2: values[values.length - 1].value,
                    precision: settings.labels.precision
                });

                xLabelFormatter = ValueFormatter.create({
                    value: settings.xAxis.displayUnits === 0
                        ? values[values.length - 1].value
                        : settings.xAxis.displayUnits,
                    precision: settings.xAxis.precision
                });

                yLabelFormatter = ValueFormatter.create({
                    value: settings.yAxis.displayUnits,
                    precision: settings.yAxis.precision
                });
            }

            dataPoints = Histogram.getDataPoints(
                values,
                numericalValues,
                bins,
                settings,
                yLabelFormatter,
                xLabelFormatter);

            return {
                dataPoints,
                borderValues,
                settings,
                xLabelFormatter,
                yLabelFormatter,
                xLegendSize,
                yLegendSize,
                formatter: valueFormatter,
                xCorrectedMin: null,
                xCorrectedMax: null
            };
        }

        public static getBorderValues(bins: LayoutBin<number>[]): HistogramBorderValues {
            const borderValues: HistogramBorderValues = {
                minX: Number.MAX_VALUE,
                maxX: -Number.MAX_VALUE,
                minY: Number.MAX_VALUE,
                maxY: -Number.MAX_VALUE
            };

            bins.forEach((dataPoint: LayoutBin<number>) => {
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

        public static getCorrectXAxisValue(value: number): number {
            if (value === undefined || isNaN(value)) {
                return 0;
            }

            return Math.max(
                Math.min(value, Histogram.MaxXAxisEndValue),
                Histogram.MinXAxisStartValue);
        }

        public static getCorrectYAxisValue(value: number): number {
            if (value === undefined || isNaN(value)) {
                return 0;
            }

            return Math.max(
                Math.min(value, Histogram.MaxXAxisEndValue),
                0);
        }

        public static areValuesNumbers(categoryColumn: DataViewCategoryColumn): boolean {
            return categoryColumn
                && categoryColumn.source
                && (categoryColumn.source.type.numeric || categoryColumn.source.type.integer);
        }

        private static getValuesByFrequencies(
            visualHost: IVisualHost,
            categoryColumn: DataViewCategoryColumn,
            sourceValues: number[],
            frequencies: number[]): HistogramValue[] {

            const values: HistogramValue[] = [],
                queryName: string = Histogram.getCategoryColumnQuery(categoryColumn);

            sourceValues.forEach((item: number, index: number) => {
                let frequency: number = Histogram.DefaultFrequency,
                    value: number = Number(item),
                    measureId: string,
                    selectionId: ISelectionId;

                value = isNaN(value)
                    ? Histogram.DefaultValue
                    : value;

                selectionId = visualHost.createSelectionIdBuilder()
                    .withCategory(categoryColumn, index)
                    .withMeasure(queryName)
                    .createSelectionId();

                if (frequencies
                    && frequencies[index]
                    && !isNaN(frequencies[index])
                    && frequencies[index] > Histogram.MinAmoutOfFrequencies) {
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
            numericalValues: number[],
            bins: LayoutBin<number>[],
            settings: HistogramSettings,
            yValueFormatter: IValueFormatter,
            xValueFormatter: IValueFormatter): HistogramDataPoint[] {

            let fontSizeInPx: string = PixelConverter.fromPoint(settings.labels.fontSize);

            return bins.map((bin: any, index: number): HistogramDataPoint => {
                bin.range = Histogram.getRange(bin.x, bin.dx);

                bin.tooltipInfo = Histogram.getTooltipData(
                    bin.y,
                    bin.range,
                    settings,
                    index === 0,
                    yValueFormatter,
                    xValueFormatter);

                bin.subDataPoints = Histogram.getSubDataPoints(values, bin, index);

                bin.labelFontSize = fontSizeInPx;

                return bin;
            });
        }

        private static getRange(x: number, dx: number): number[] {
            return [x, x + dx];
        }

        private static getTooltipData(
            value: number,
            range: number[],
            settings: HistogramSettings,
            includeLeftBorder: boolean,
            yValueFormatter: IValueFormatter,
            xValueFormatter: IValueFormatter): VisualTooltipDataItem[] {

            return [
                {
                    displayName: Histogram.getLegendText(settings),
                    value: yValueFormatter.format(value)
                }, {
                    displayName: Histogram.TooltipDisplayName,
                    value: Histogram.rangeToString(range, includeLeftBorder, xValueFormatter)
                }
            ];
        }

        private static getSubDataPoints(
            values: HistogramValue[],
            bin: HistogramDataPoint,
            index: number): HistogramSubDataPoint[] {

            let dataPoints: SelectableDataPoint[] = [];

            values.forEach((value: HistogramValue) => {
                if (Histogram.isValueContainedInRange(value, bin, index)) {
                    dataPoints.push({
                        identity: value.selectionId,
                        selected: false
                    });
                }
            });

            return dataPoints;
        }

        private static isValueContainedInRange(value: HistogramValue, bin: LayoutBin<number>, index: number): boolean {
            return ((index === 0 && value.value >= bin.x) || (value.value > bin.x))
                && value.value <= bin.x + bin.dx;
        }

        private static getDisplayName(dataView: DataView): string {
            return (dataView
                && dataView.metadata
                && dataView.metadata.columns
                && dataView.metadata.columns[0]
                && dataView.metadata.columns[0].displayName) || null;
        }

        private static parseSettings(dataView: DataView): HistogramSettings {
            let settings: HistogramSettings = HistogramSettings.parse<HistogramSettings>(dataView),
                displayName: string = Histogram.getDisplayName(dataView),
                bins: number = Math.round(settings.general.bins);

            if (displayName) {
                settings.general.displayName = displayName;
            }

            if (isNaN(bins) || bins <= HistogramGeneralSettings.MinNumberOfBins) {
                bins = HistogramGeneralSettings.DefaultBins;
            } else if (bins > HistogramGeneralSettings.MaxNumberOfBins) {
                bins = HistogramGeneralSettings.MaxNumberOfBins;
            }

            settings.general.bins = bins;

            settings.xAxis.precision = Histogram.getPrecision(settings.xAxis.precision);
            settings.yAxis.precision = Histogram.getPrecision(settings.yAxis.precision);
            settings.labels.precision = Histogram.getPrecision(settings.labels.precision);

            settings.general.displayName = Histogram.getLegend(
                settings.general.displayName,
                settings.xAxis.style,
                settings.xAxis.displayUnits);

            return settings;
        }

        private static getPrecision(precision: number): number {
            return Math.min(
                Math.max(precision, Histogram.MinPrecision),
                Histogram.MaxPrecision);
        }

        public static getLegend(title: string, style: HistogramAxisStyle, displayUnit: number): string {
            let retValue: string,
                formatter: IValueFormatter;

            formatter = ValueFormatter.create({
                value: displayUnit
            });

            switch (style) {
                case HistogramAxisStyle.showTitleOnly: {
                    retValue = title;

                    break;
                }
                case HistogramAxisStyle.showUnitOnly: {
                    retValue = !(displayUnit === 0 || displayUnit === 1) && formatter.displayUnit
                        ? formatter.displayUnit.title
                        : title;

                    break;
                }
                case HistogramAxisStyle.showBoth: {
                    retValue = !(displayUnit === 0 || displayUnit === 1) && formatter.displayUnit
                        ? `${title} (${formatter.displayUnit.title})`
                        : title;

                    break;
                }
            }

            return retValue;
        }

        public isDataValid(data: HistogramDataView): boolean {
            if (!data
                || !data.dataPoints
                || data.dataPoints.length === Histogram.MinAmountOfDataPoints) {

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
            let borderValues: HistogramBorderValues,
            xAxisSettings: HistogramXAxisSettings;

            if (!options
                || !options.dataViews
                || !options.dataViews[0]) {
                return;
            }

            let dataView: DataView = options.dataViews[0],
                maxWidthOfVerticalAxisLabel: number;

            this.setSize(options.viewport);

            this.dataView = Histogram.converter(
                dataView,
                this.visualHost);

            borderValues = this.dataView.borderValues;
            xAxisSettings = this.dataView.settings.xAxis;

            if (!this.isDataValid(this.dataView)) {
                this.clear();

                return;
            }

            this.updateViewportIn();

            maxWidthOfVerticalAxisLabel = this.updateAxes(dataView);

            this.columsAndAxesTransform(maxWidthOfVerticalAxisLabel);

            this.createScales();

            this.applySelectionStateToData();

            this.render();
        }

        private updateAxes(dataView: DataView): number {
            let maxWidthOfVerticalAxisLabel: number,
                maxWidthOfHorizontalAxisLabel: number,
                maxHeightOfVerticalAxisLabel: number;

            maxWidthOfVerticalAxisLabel = Histogram.getWidthOfLabel(
                this.dataView.borderValues.maxY,
                this.dataView.yLabelFormatter);

            maxWidthOfHorizontalAxisLabel = Histogram.getWidthOfLabel(
                this.dataView.borderValues.maxX,
                this.dataView.xLabelFormatter);

            maxHeightOfVerticalAxisLabel = Histogram.getHeightOfLabel(
                this.dataView.borderValues.maxX,
                this.dataView.xLabelFormatter);

            let ySource = dataView.categorical.values &&
                dataView.categorical.values[0] &&
                dataView.categorical.values[0].values
                ? dataView.categorical.values[0].source
                : dataView.categorical.categories[0].source;

            this.yAxisProperties = this.calculateYAxes(ySource, maxHeightOfVerticalAxisLabel);

            this.renderYAxis();

            this.yTitleMargin = this.shouldShowYOnRight()
                ? this.viewport.width
                - Histogram.YTitleMargin
                + this.dataView.yLegendSize
                : Histogram.MinYTitleMargin;

            this.updateViewportIn(maxWidthOfVerticalAxisLabel);

            this.xAxisProperties = this.calculateXAxes(
                dataView.categorical.categories[0].source,
                Histogram.DefaultTextProperties,
                maxWidthOfHorizontalAxisLabel,
                false);

            this.renderXAxis();

            return maxWidthOfVerticalAxisLabel;
        }

        private applySelectionStateToData(): void {
            if (this.interactivityService) {
                this.dataView.dataPoints.forEach((dataPoint: HistogramDataPoint) => {
                    this.interactivityService.applySelectionStateToData(dataPoint.subDataPoints);
                });
            }
        }

        private createScales(): void {
            const yAxisSettings: HistogramYAxisSettings = this.dataView.settings.yAxis,
                xAxisSettings: HistogramXAxisSettings = this.dataView.settings.xAxis,
                borderValues: HistogramBorderValues = this.dataView.borderValues;

            this.dataView.xScale = d3.scale.linear()
                .domain([
                    this.dataView.xCorrectedMin !== null ? this.dataView.xCorrectedMin : xAxisSettings.start,
                    this.dataView.xCorrectedMax !== null ? this.dataView.xCorrectedMax : xAxisSettings.end
                ])
                .range([
                    0,
                    this.viewportIn.width
                ]);

            this.dataView.yScale = d3.scale.linear()
                .domain([
                    yAxisSettings.start,
                    yAxisSettings.end
                ])
                .range([
                    this.viewportIn.height,
                    this.outerPadding
                ]);
        }

        private updateViewportIn(maxWidthOfVerticalAxisLabel: number = 0): void {
            let width: number,
                height: number;

            width = this.viewport.width
                - this.dataView.yLegendSize
                - maxWidthOfVerticalAxisLabel;

            height = this.viewport.height - this.dataView.xLegendSize;

            this.viewportIn = {
                height: Math.max(height, Histogram.MinViewportInSize),
                width: Math.max(width, Histogram.MinViewportInSize)
            };
        }

        private updateWidthOfColumn(updateMode: UpdateColumnsWidthMode): void {
            let countOfValues: number = this.dataView.dataPoints.length,
                widthOfColumn: number,
                borderValues: HistogramBorderValues = this.dataView.borderValues,
                firstDataPoint: number = this.dataView.xCorrectedMin ? this.dataView.xCorrectedMin : borderValues.minX;

            widthOfColumn = countOfValues ? this.dataView.xScale(firstDataPoint + this.dataView.dataPoints[0].dx) - Histogram.ColumnPadding : Histogram.MinViewportInSize;

            this.widthOfColumn = Math.max(widthOfColumn, Histogram.MinViewportInSize);
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

        private clearElement(selection: Selection<any>): void {
            selection
                .selectAll("*")
                .remove();
        }

        private static getLegendSize(axisSettings: HistogramAxisSettings): number {
            return axisSettings.title
                ? Histogram.LegendSizeWhenTitleIsActive
                : Histogram.LegendSizeWhenTitleIsNotActive;
        }

        private static getWidthOfLabel(
            labelValue: number | string,
            valueFormatter: IValueFormatter): number {

            const textProperties: TextProperties =
                Histogram.getTextPropertiesForMeasurement(labelValue, valueFormatter);

            return textMeasurementService.measureSvgTextWidth(textProperties) + Histogram.AdditionalWidthOfLabel;
        }

        private static getHeightOfLabel(
            labelValue: number | string,
            valueFormatter: IValueFormatter): number {

            const textProperties: TextProperties =
                Histogram.getTextPropertiesForMeasurement(labelValue, valueFormatter);

            return textMeasurementService.measureSvgTextHeight(textProperties) + Histogram.AdditionalHeightOfLabel;
        }

        private static getTextPropertiesForMeasurement(
            labelValue: string | number,
            valueFormatter?: IValueFormatter): TextProperties {

            let labelText: string;

            if (valueFormatter) {
                labelText = valueFormatter.format(labelValue);
            } else {
                labelText = labelValue as string;
            }

            return Histogram.getTextProperties(labelText);
        }

        private setSize(viewport: IViewport): void {
            let height: number,
                width: number;

            height = viewport.height
                - Histogram.Margin.top
                - Histogram.Margin.bottom;

            width = viewport.width
                - Histogram.Margin.left
                - Histogram.Margin.right;

            this.viewport = {
                height: Math.max(height, Histogram.MinViewportSize),
                width: Math.max(width, Histogram.MinViewportSize)
            };

            this.updateElements(
                Math.max(viewport.height, Histogram.MinViewportSize),
                Math.max(viewport.width, Histogram.MinViewportSize));
        }

        private updateElements(height: number, width: number): void {
            const transform: string = translate(
                Histogram.Margin.left,
                Histogram.Margin.top);

            this.root.attr({
                height: height,
                width: width
            });

            this.main.attr("transform", transform);
            this.legend.attr("transform", transform);
        }

        public shouldShowYOnRight(): boolean {
            return this.dataView.settings.yAxis.position === HistogramPositionType.Right;
        }

        private columsAndAxesTransform(labelWidth: number): void {
            let offsetToRightStr: string,
                offsetToRight: number = this.shouldShowYOnRight()
                    ? Histogram.Margin.left
                    : this.dataView.settings.yAxis.title
                        ? Histogram.Margin.left + labelWidth + Histogram.YAxisMargin
                        : Histogram.Margin.left + labelWidth;

            offsetToRightStr = translate(
                offsetToRight + Histogram.ColumnAndLabelOffset,
                Histogram.DefaultPosition);

            this.columns.attr("transform", offsetToRightStr);
            this.labelGraphicsContext.attr("transform", offsetToRightStr);

            this.axes.attr("transform", translate(
                offsetToRight,
                Histogram.DefaultPosition));

            this.axisY.attr("transform", translate(
                this.shouldShowYOnRight()
                    ? this.viewportIn.width
                    : Histogram.DefaultPosition,
                Histogram.DefaultPosition));

            this.axisX.attr("transform", translate(
                Histogram.DefaultPosition,
                this.viewportIn.height));
        }

        private render(): void {
            const columnsSelection: UpdateSelection<any> = this.renderColumns();

            this.bindTooltipsToSelection(columnsSelection);

            this.bindSelectionHandler(columnsSelection);

            this.renderLegend();

            this.renderLabels();
        }

        private renderColumns(): UpdateSelection<HistogramDataPoint> {
            let data: HistogramDataPoint[] = this.dataView.dataPoints,
                xScale: LinearScale<any, any> = this.dataView.xScale,
                yScale: LinearScale<any, any> = this.dataView.yScale,
                updateColumnsSelection: UpdateSelection<any>;

            updateColumnsSelection = this.columnsSelection.data(data);

            updateColumnsSelection
                .enter()
                .append("svg:rect")
                .classed(Histogram.Column.className, true);

            // We can operate by xScale inside this function only when scale was created
            this.updateWidthOfColumn(UpdateColumnsWidthMode.standardCalculation);

            updateColumnsSelection
                .attr({
                    "x": (dataPoint: HistogramDataPoint) => {
                        return xScale(dataPoint.x);
                    },
                    "y": (dataPoint: HistogramDataPoint) => {
                        return yScale(dataPoint.y);
                    },
                    "width": this.widthOfColumn,
                    "height": (dataPoint: HistogramDataPoint) => {
                        return this.getColumnHeight(dataPoint, yScale);
                    }
                })
                .style("fill", this.dataView.settings.dataPoint.fill);

            histogramUtils.updateFillOpacity(
                updateColumnsSelection,
                this.interactivityService,
                false);

            updateColumnsSelection
                .exit()
                .remove();

            return updateColumnsSelection;
        }

        private bindTooltipsToSelection(selection: UpdateSelection<any>): void {
            this.tooltipServiceWrapper.addTooltip(selection, (eventArgs: TooltipEventArgs<HistogramDataPoint>) => {
                return eventArgs.data.tooltipInfo;
            });
        }

        private getColumnHeight(column: LayoutBin<number>, y: LinearScale<any, any>): number {
            const height: number = this.viewportIn.height - y(column.y);

            return Math.max(height, Histogram.MinColumnHeight);
        }

        private renderXAxis(): void {
            let xAxis: SVGAxis,
                xShow: boolean = this.dataView.settings.xAxis.show,
                axisColor: string = this.dataView.settings.xAxis.axisColor;

            xAxis = this.xAxisProperties.axis
                .tickFormat(((value: number, index: number) => {
                    let tickValues: any[] = this.xAxisProperties.axis.tickValues(),
                        amountOfLabels: number = (tickValues && tickValues.length)
                            || Histogram.MinAmountOfLabels;

                    return this.formatLabelOfXAxis(value, index, amountOfLabels);
                }) as any) // We cast this function to any, because the type definition doesn't contain the second argument
                .orient("bottom");

            if (xShow) {
                this.axisX.call(xAxis);
            } else {
                this.clearElement(this.axisX);
            }

            this.updateFillColorOfAxis(this.axisX, axisColor);
        }

        private formatLabelOfXAxis(labelValue: number | string, index: number, amountOfLabels: number): string {
            let maxWidthOfTheLatestLabel: number,
                formattedLabel: string = this.dataView.xLabelFormatter.format(labelValue);

            if (index === 0 || index === amountOfLabels - 1) {
                maxWidthOfTheLatestLabel = Math.min(
                    this.viewportIn.width,
                    Histogram.MaxWidthOfTheLatestLabel);

                formattedLabel = Histogram.getTailoredTextOrDefault(
                    formattedLabel,
                    maxWidthOfTheLatestLabel);
            }

            return formattedLabel;
        }

        private static getTailoredTextOrDefault(text: string, maxWidth: number): string {
            const textProperties = Histogram.getTextProperties(text);

            return textMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
        }

        private static getTextProperties(text: string): TextProperties {
            return {
                text: text,
                fontFamily: Histogram.DefaultTextProperties.fontFamily,
                fontSize: Histogram.DefaultTextProperties.fontSize
            };
        }

        private renderYAxis(): void {
            let yAxis: SVGAxis,
                yShow: boolean = this.dataView.settings.yAxis.show,
                axisColor: string = this.dataView.settings.yAxis.axisColor;

            yAxis = this.yAxisProperties.axis
                .orient(this.dataView.settings.yAxis.position.toString().toLowerCase())
                .tickFormat((item: number) => {
                    return this.dataView.yLabelFormatter.format(item);
                });

            if (yShow) {
                this.axisY.call(yAxis);
            } else {
                this.clearElement(this.axisY);
            }

            this.updateFillColorOfAxis(this.axisY, axisColor);
        }

        private updateFillColorOfAxis(axisSelection: Selection<any>, fillColor: string): void {
            axisSelection
                .selectAll("g.tick text")
                .style({
                    "fill": fillColor
                });
        }

        private getLabelLayout(): ILabelLayout {
            let labelSettings: HistogramLabelSettings = this.dataView.settings.labels,
                fontSizeInPx: string = PixelConverter.fromPoint(labelSettings.fontSize),
                fontFamily: string = dataLabelUtils.LabelTextProperties.fontFamily,
                xScale: LinearScale<any, any> = this.dataView.xScale,
                yScale: LinearScale<any, any> = this.dataView.yScale,
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

                        x = xScale(dataPoint.x);
                        dx = dataPoint.size.width / Histogram.DataLabelXOffset
                            - this.widthOfColumn / Histogram.MiddleFactor;

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

        private renderLabels(): void {
            let labelSettings: HistogramLabelSettings = this.dataView.settings.labels,
                dataPointsArray: HistogramDataPoint[] = this.dataView.dataPoints,
                labels: UpdateSelection<HistogramDataPoint>;

            if (!labelSettings.show) {
                dataLabelUtils.cleanDataLabels(this.labelGraphicsContext);

                return;
            }

            labels = dataLabelUtils.drawDefaultLabelsForDataPointChart(
                dataPointsArray,
                this.labelGraphicsContext,
                this.getLabelLayout(),
                this.viewportIn);

            if (labels) {
                labels.attr("transform", (dataPoint: HistogramDataPoint) => {
                    let size: ISize = dataPoint.size,
                        dx: number,
                        dy: number;

                    dx = size.width / Histogram.DataLabelXOffset;
                    dy = size.height / Histogram.DataLabelYOffset;

                    return translate(dx, dy);
                });
            }
        }

        private static rangesToArray(data: HistogramDataPoint[]): number[] {
            return data.reduce((previousValue: number[], currentValue: HistogramDataPoint, index: number) => {
                let range: number[];

                range = (index === 0)
                    ? currentValue.range
                    : currentValue.range.slice(1);

                return previousValue.concat(range);
            }, []);
        }

        private static rangeToString(
            range: number[],
            includeLeftBorder: boolean,
            valueFormatter: IValueFormatter): string {

            let leftBracket: string,
                rightBracket: string = Histogram.IncludeBrackets.right,
                leftBorder: string = valueFormatter.format(range[0]),
                rightBorder: string = valueFormatter.format(range[1]);

            leftBracket = includeLeftBorder
                ? Histogram.IncludeBrackets.left
                : Histogram.ExcludeBrackets.left;

            return `${leftBracket}${leftBorder}${Histogram.SeparatorNumbers}${rightBorder}${rightBracket}`;
        }

        private renderLegend(): void {
            let legendElements: Selection<Legend>,
                legendSelection: UpdateSelection<Legend>,
                datalegends: Legend[] = this.getDataLegends(this.dataView.settings);

            legendElements = this.main
                .select(Histogram.Legends.selectorName)
                .selectAll(Histogram.Legend.selectorName);

            legendSelection = legendElements.data(datalegends);

            legendSelection
                .enter()
                .append("svg:text");

            legendSelection
                .attr({
                    "x": Histogram.DefaultLegendPosition,
                    "y": Histogram.DefaultLegendPosition,
                    "dx": (legend: Legend) => legend.dx,
                    "dy": (legend: Legend) => legend.dy,
                    "transform": (legend: Legend) => legend.transform
                })
                .text((item: Legend) => item.text)
                .classed(Histogram.Legend.className, true);

            legendSelection
                .exit()
                .remove();

            this.legend
                .select("text")
                .style({
                    "display": Histogram.getDispayForAxisTitle(this.dataView.settings.xAxis)
                });

            this.legend
                .selectAll("text")
                .filter((d, index: number) => index === 1)
                .style({
                    "display": Histogram.getDispayForAxisTitle(this.dataView.settings.yAxis)
                });
        }

        private static getDispayForAxisTitle(axisSettings: HistogramAxisSettings): string {
            return axisSettings && axisSettings.title
                ? null
                : "none";
        }

        private getDataLegends(settings: HistogramSettings): Legend[] {
            let bottomLegendText: string = Histogram.getLegendText(settings);

            bottomLegendText = Histogram.getLegend(
                bottomLegendText,
                settings.yAxis.style,
                settings.yAxis.displayUnits);

            return [
                {
                    transform: translate(
                        this.viewport.width / Histogram.MiddleFactor,
                        this.viewport.height),
                    text: Histogram.getTailoredTextOrDefault(
                        settings.general.displayName,
                        this.viewportIn.width),
                    dx: Histogram.DefaultXAxisDx,
                    dy: Histogram.DefaultXAxisDy
                }, {
                    transform: translateAndRotate(
                        this.shouldShowYOnRight()
                            ? this.yTitleMargin
                            : Histogram.DefaultPosition,
                        this.viewport.height / Histogram.MiddleFactor,
                        Histogram.DefaultPosition,
                        Histogram.DefaultPosition,
                        Histogram.DefaultAngle),
                    text: Histogram.getTailoredTextOrDefault(
                        bottomLegendText,
                        this.viewportIn.height),
                    dx: Histogram.DefaultYAxisDx
                }
            ];
        }

        private static getLegendText(settings: HistogramSettings): string {
            return settings.general.frequency
                ? Histogram.FrequencyText
                : Histogram.DensityText;
        }

        private bindSelectionHandler(columnsSelection: UpdateSelection<HistogramDataPoint>): void {
            if (!this.interactivityService
                || !this.dataView
                || !this.dataView.dataPoints) {

                return;
            }

            let subDataPoints: SelectableDataPoint[] = [];

            this.dataView.dataPoints.forEach((dataPoint: HistogramDataPoint) => {
                subDataPoints = subDataPoints.concat(dataPoint.subDataPoints);
            });

            let behaviorOptions: HistogramBehaviorOptions = {
                columns: columnsSelection,
                clearCatcher: this.clearCatcher,
                interactivityService: this.interactivityService,
            };

            this.interactivityService.bind(
                subDataPoints,
                this.behavior,
                behaviorOptions);
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            const settings: HistogramSettings = this.dataView && this.dataView.settings
                ? this.dataView.settings
                : HistogramSettings.getDefault() as HistogramSettings;

            return HistogramSettings.enumerateObjectInstances(settings, options);
        }

        public destroy(): void {
            this.root = null;
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

            return this.formatXlabelsForFiltering(currentBorderMax);
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

            return this.formatXlabelsForFiltering(currentBorderMin);
        }

        private formatXlabelsForFiltering(
            nonFormattedPoint: number
        ): number {
            let formattedPoint: string = this.dataView.xLabelFormatter.format(nonFormattedPoint);
            return parseFloat(formattedPoint);
        }

        private calculateXAxes(
            source: DataViewMetadataColumn,
            textProperties: TextProperties,
            widthOfLabel: number,
            scrollbarVisible: boolean): IAxisProperties {

            let axes: IAxisProperties,
                width: number = this.viewportIn.width,
                xAxisSettings: HistogramXAxisSettings = this.dataView.settings.xAxis,
                xPoints: number[],
                interval: number,
                borderValues: HistogramBorderValues = this.dataView.borderValues,
                tmpStart: number,
                tmpEnd: number,
                tmpArr: number[],
                closerLimit: number;

            xPoints = Histogram.rangesToArray(this.dataView.dataPoints);

            // It is necessary to find out interval to calculate all necessary points before and after offset (if start and end for X axis was changed by user)
            if ((borderValues.maxX !== xAxisSettings.end || borderValues.minX !== xAxisSettings.start) && xPoints.length > 1) {
                interval = this.dataView.dataPoints[0].dx;

                // If start point is greater than min border, it is necessary to remove non-using data points
                if (xAxisSettings.start > borderValues.minX) {
                    closerLimit = this.findBorderMinCloserToXAxisStart(borderValues.minX, xAxisSettings.start, interval);
                    xPoints = xPoints.filter(dpv => this.formatXlabelsForFiltering(dpv) >= closerLimit);
                    this.dataView.xCorrectedMin = xPoints && xPoints.length > 0 ? xPoints[0] : null;
                }
                else {
                    // Add points before
                    tmpArr = [];
                    tmpStart = borderValues.minX;
                    while (xAxisSettings.start < tmpStart) {
                        tmpStart = tmpStart - interval;
                        tmpArr.push(tmpStart);
                        this.dataView.xCorrectedMin = tmpStart;
                    }
                    tmpArr.reverse();
                    xPoints = tmpArr.concat(xPoints);
                }

                // If end point is lesser than max border, it is necessary to remove non-using data points
                if (xAxisSettings.end < borderValues.maxX) {
                    closerLimit = this.findBorderMaxCloserToXAxisEnd(borderValues.maxX, xAxisSettings.end, interval);
                    xPoints = xPoints.filter(dpv => this.formatXlabelsForFiltering(dpv) <= closerLimit);
                    this.dataView.xCorrectedMax = xPoints && xPoints.length > 0 ? xPoints[xPoints.length - 1] : null;
                }
                else {
                    // Add points after
                    tmpEnd = borderValues.maxX;
                    while (xAxisSettings.end > tmpEnd) {
                        tmpEnd = tmpEnd + interval;
                        xPoints.push(tmpEnd);
                        this.dataView.xCorrectedMax = tmpEnd;
                    }
                }
            }

            axes = this.calculateXAxesProperties(
                xPoints,
                axisScale.linear,
                source,
                Histogram.InnerPaddingRatio,
                widthOfLabel);

            axes.willLabelsFit = willLabelsFit(
                axes,
                width,
                textMeasurementService.measureSvgTextWidth,
                textProperties);

            // If labels do not fit and we are not scrolling, try word breaking
            axes.willLabelsWordBreak = (!axes.willLabelsFit && !scrollbarVisible) && willLabelsWordBreak(
                axes, Histogram.Margin, width, textMeasurementService.measureSvgTextWidth,
                textMeasurementService.estimateSvgTextHeight, textMeasurementService.getTailoredTextOrDefault,
                textProperties);

            return axes;
        }

        private calculateXAxesProperties(
            forcedXDomain: any[],
            categoryAxisScaleType: string,
            metaDataColumn: DataViewMetadataColumn,
            innerPaddingRatio: number,
            minOrdinalRectThickness: number): IAxisProperties {

            let xAxisProperties = HistogramAxisHelper.createAxis({
                pixelSpan: this.viewportIn.width,
                dataDomain: forcedXDomain,
                metaDataColumn: metaDataColumn,
                formatString: valueFormatter.getFormatStringByColumn(metaDataColumn),
                outerPadding: Histogram.DefaultOuterPadding,
                isScalar: false,
                isVertical: false,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: true,
                getValueFn: (index, valueType) => index,
                scaleType: categoryAxisScaleType,
                innerPaddingRatio: innerPaddingRatio,
                minOrdinalRectThickness: minOrdinalRectThickness,
                tickLabelPadding: undefined
            });

            xAxisProperties.axisLabel = this.dataView.settings.general.displayName;

            return xAxisProperties;
        }

        private calculateYAxes(
            source: DataViewMetadataColumn,
            heightOfLabel: number): IAxisProperties {

            let yAxisSettings: HistogramYAxisSettings = this.dataView.settings.yAxis;

            return this.calculateYAxesProperties(
                [yAxisSettings.start, yAxisSettings.end],
                axisScale.linear,
                source,
                Histogram.InnerPaddingRatio,
                heightOfLabel);
        }

        private calculateYAxesProperties(
            forcedYDomain: any[],
            categoryAxisScaleType: string,
            metaDataColumn: DataViewMetadataColumn,
            innerPaddingRatio: number,
            minOrdinalRectThickness: number): IAxisProperties {

            let formatString: string = undefined;

            if (this.dataView.settings.general.frequency) {
                formatString = valueFormatter.getFormatStringByColumn(metaDataColumn);
            }

            return HistogramAxisHelper.createAxis({
                pixelSpan: this.viewportIn.height,
                dataDomain: forcedYDomain,
                metaDataColumn: metaDataColumn,
                formatString: formatString,
                outerPadding: this.outerPadding,
                isScalar: true,
                isVertical: true,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: false,
                getValueFn: (index: number) => index,
                scaleType: categoryAxisScaleType,
                innerPaddingRatio: innerPaddingRatio,
                minOrdinalRectThickness: minOrdinalRectThickness,
                tickLabelPadding: undefined,
                is100Pct: true
            });
        }
    }
}
