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
    import Selection = d3.Selection;
    import UpdateSelection = d3.selection.Update;
    import SVGAxis = d3.svg.Axis;
    import LayoutBin = d3.layout.histogram.Bin;
    import LinearScale = d3.scale.Linear;

    // jsCommon
    import PixelConverter = jsCommon.PixelConverter;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;

    // powerbi
    import IViewport = powerbi.IViewport;

    import TextProperties = powerbi.TextProperties;
    import DataView = powerbi.DataView;
    import Fill = powerbi.Fill;
    import VisualObjectInstance = powerbi.VisualObjectInstance;
    import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
    import DataViewObjects = powerbi.DataViewObjects;
    import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
    import TextMeasurementService = powerbi.TextMeasurementService;
    import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;
    import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
    import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

    // powerbi.extensibility
    import IVisual = powerbi.extensibility.IVisual;

    // powerbi.extensibility.visual
    import IVisualHost = powerbi.extensibility.visual.IVisualHost;
    import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
    import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

    import ISelectionId = powerbi.visuals.ISelectionId;
    import ValueFormatter = powerbi.visuals.valueFormatter;
    import IMargin = powerbi.visuals.IMargin;
    import IValueFormatter = powerbi.visuals.IValueFormatter;
    import VisualTooltipDataItem = powerbi.visuals.VisualTooltipDataItem;
    import ColorHelper = powerbi.visuals.ColorHelper;
    import SVGUtil = powerbi.visuals.SVGUtil;
    import TooltipManager = powerbi.visuals.TooltipManager;
    import TooltipEvent = powerbi.visuals.TooltipEvent;
    import ILabelLayout = powerbi.visuals.ILabelLayout;
    import dataLabelUtils = powerbi.visuals.dataLabelUtils;
    import willLabelsFit = powerbi.visuals.AxisHelper.LabelLayoutStrategy.willLabelsFit;
    import willLabelsWordBreak = powerbi.visuals.AxisHelper.LabelLayoutStrategy.willLabelsWordBreak;
    import axisScale = powerbi.visuals.axisScale;
    import valueFormatter = powerbi.visuals.valueFormatter;
    import IAxisProperties = powerbi.visuals.IAxisProperties;
    import IInteractiveBehavior = powerbi.visuals.IInteractiveBehavior;
    import ISelectionHandler = powerbi.visuals.ISelectionHandler;
    import IInteractivityService = powerbi.visuals.IInteractivityService;
    import appendClearCatcher = powerbi.visuals.appendClearCatcher;
    import createInteractivityService = powerbi.visuals.createInteractivityService;
    import SelectableDataPoint = powerbi.visuals.SelectableDataPoint;
    import ITooltipService = powerbi.visuals.ITooltipService;
    import createTooltipService = powerbi.visuals.createTooltipService;
    import TooltipEventArgs = powerbi.visuals.TooltipEventArgs;
    import ISize = powerbi.visuals.shapes.ISize;

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

        private static MinNumberOfBins: number = 0;
        private static MaxNumberOfBins: number = 100;

        private static MinPrecision: number = 0;
        private static MaxPrecision: number = 17; // max number of decimals in float

        public static MinXAxisStartValue: number = 0;
        public static MaxXAxisEndValue: number = 1e+25;

        private static YTitleMargin: number = 70;
        private static YAxisMargin: number = 20;

        private static MinViewportSize: number = 100;
        private static MinViewportInSize: number = 0;

        private static MinAmountOfValues: number = 2;

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
            fontFamily: "'Segoe UI', 'wf_segoe-ui_normal', helvetica, arial, sans-serif",
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

        private tooltipService: ITooltipService;

        private get columnsSelection(): d3.Selection<HistogramDataPoint> {
            return this.main.select(Histogram.Columns.selector)
                .selectAll(Histogram.Column.selector);
        }

        constructor(options: VisualConstructorOptions) {
            this.init(options);
        }

        public init(options: VisualConstructorOptions): void {
            this.visualHost = options.host;

            this.interactivityService = createInteractivityService(this.visualHost);
            this.behavior = HistogramBehavior.create();

            this.tooltipService = createTooltipService(options.host);

            this.root = d3.select(options.element)
                .append("svg")
                .classed(Histogram.ClassName, true);

            this.clearCatcher = appendClearCatcher(this.root);

            this.main = this.root.append("g");

            this.columns = this.main
                .append("g")
                .classed(Histogram.Columns.class, true);

            this.axes = this.main
                .append("g")
                .classed(Histogram.Axes.class, true);

            this.axisX = this.axes
                .append("g")
                .classed(Histogram.Axis.class, true)
                .classed(Histogram.XAxis.class, true);

            this.axisY = this.axes
                .append("g")
                .classed(Histogram.Axis.class, true)
                .classed(Histogram.YAxis.class, true);

            this.legend = this.main
                .append("g")
                .classed(Histogram.Legends.class, true);

            this.labelGraphicsContext = this.main
                .append("g")
                .classed(Histogram.LabelGraphicsContext.class, true);
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
                histogramLayout: d3.layout.Histogram<number>,
                values: HistogramValue[],
                numericalValues: number[] = [],
                bins: LayoutBin<number>[],
                dataPoints: HistogramDataPoint[],
                valueFormatter: IValueFormatter,
                frequencies: number[] = [],
                shiftByValues: number = 0,
                sumFrequency: number = 0,
                xLabelFormatter: IValueFormatter,
                yLabelFormatter: IValueFormatter,
                xLegendSize: number,
                yLegendSize: number,
                borderValues: HistogramBorderValues,
                yAxisSettings: HistogramYAxisSettings,
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

            if (settings.general.bins && settings.general.bins > Histogram.MinNumberOfBins) {
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

            yAxisSettings = settings.yAxis;

            let maxYvalue: number = (yAxisSettings.end !== null) && (yAxisSettings.end > yAxisSettings.start)
                ? yAxisSettings.end
                : borderValues.maxY;

            let minYValue: number = yAxisSettings.start < maxYvalue
                ? yAxisSettings.start
                : 0;

            settings.yAxis.start = Histogram.getCorrectXAxisValue(minYValue);
            settings.yAxis.end = Histogram.getCorrectXAxisValue(maxYvalue);

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
                formatter: valueFormatter
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
            return Math.max(Math.min(value, Histogram.MaxXAxisEndValue), Histogram.MinXAxisStartValue);
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
                let frequency: number = 1,
                    value: number = Number(item),
                    measureId: string,
                    selectionId: ISelectionId;

                value = isNaN(value) ? 0 : value;

                selectionId = visualHost.createSelectionIdBuilder()
                    .withCategory(categoryColumn, index)
                    .withMeasure(queryName)
                    .createSelectionId();

                if (frequencies
                    && frequencies[index]
                    && !isNaN(frequencies[index])
                    && frequencies[index] > 1) {
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

            if (isNaN(bins) || bins <= Histogram.MinNumberOfBins) {
                bins = null;
            } else if (bins > Histogram.MaxNumberOfBins) {
                bins = Histogram.MaxNumberOfBins;
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
                        ? title + " (" + formatter.displayUnit.title + ")"
                        : title;

                    break;
                }
            }

            return retValue;
        }

        public isDataValid(data: HistogramDataView): boolean {
            if (!data || !data.dataPoints || data.dataPoints.length === 0) {
                return false;
            }

            if (data.dataPoints.some(x => x.range.some(x => isNaN(x) || x === Infinity || x === -Infinity))) {
                return false;
            }

            return true;
        }

        public update(options: VisualUpdateOptions): void {
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

            if (!this.isDataValid(this.dataView)) {
                this.clear();

                return;
            }

            this.updateViewportIn();

            maxWidthOfVerticalAxisLabel = this.updateAxes(dataView);

            this.columsAndAxesTransform(maxWidthOfVerticalAxisLabel);

            this.updateWidthOfColumn();

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
                : 0;

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
                borderValues: HistogramBorderValues = this.dataView.borderValues;

            this.dataView.xScale = d3.scale.linear()
                .domain([
                    borderValues.minX,
                    borderValues.maxX
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

        private updateWidthOfColumn(): void {
            let countOfValues: number = this.dataView.dataPoints.length,
                widthOfColumn: number;

            widthOfColumn = countOfValues
                ? this.viewportIn.width / countOfValues - Histogram.ColumnPadding
                : Histogram.MinViewportInSize;

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

            return TextMeasurementService.measureSvgTextWidth(textProperties) + Histogram.AdditionalWidthOfLabel;
        }

        private static getHeightOfLabel(
            labelValue: number | string,
            valueFormatter: IValueFormatter): number {

            const textProperties: TextProperties =
                Histogram.getTextPropertiesForMeasurement(labelValue, valueFormatter);

            return TextMeasurementService.measureSvgTextHeight(textProperties) + Histogram.AdditionalHeightOfLabel;
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
            const transform: string = SVGUtil.translate(
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

            offsetToRightStr = SVGUtil.translate(offsetToRight + Histogram.ColumnAndLabelOffset, 0);

            this.columns.attr("transform", offsetToRightStr);
            this.labelGraphicsContext.attr("transform", offsetToRightStr);

            this.axes.attr("transform", SVGUtil.translate(offsetToRight, 0));

            this.axisY.attr("transform", SVGUtil.translate(
                this.shouldShowYOnRight()
                    ? this.viewportIn.width : 0, 0));

            this.axisX.attr(
                "transform",
                SVGUtil.translate(0, this.viewportIn.height));
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
                .classed(Histogram.Column.class, true);

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
            this.tooltipService.addTooltip(selection, (eventArgs: TooltipEventArgs<HistogramDataPoint>) => {
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
                        amountOfLabels: number = (tickValues && tickValues.length) || 0;

                    return this.formatLabelOfXAxis(value, index, amountOfLabels);
                }) as any) // We cast this function to any, because the type definition doesn't contain the second argument
                .orient("bottom");

            if (xShow) {
                this.axisX.call(xAxis);
            } else {
                this.axisX
                    .selectAll("*")
                    .remove();
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

            return TextMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
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
                this.axisY
                    .selectAll("*")
                    .remove();
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
                        dx = dataPoint.size.width / Histogram.DataLabelXOffset - this.widthOfColumn / 2;

                        return x - dx;
                    },
                    y: (dataPoint: HistogramDataPoint) => {
                        let y: number,
                            dy: number;

                        y = yScale(dataPoint.y);
                        dy = dataPoint.size.height;

                        return y - dy;
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

                    return SVGUtil.translate(dx, dy);
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
                .select(Histogram.Legends.selector)
                .selectAll(Histogram.Legend.selector);

            legendSelection = legendElements.data(datalegends);

            legendSelection
                .enter()
                .append("svg:text");

            legendSelection
                .attr({
                    "x": 0,
                    "y": 0,
                    "dx": (item: Legend) => item.dx,
                    "dy": (item: Legend) => item.dy,
                    "transform": (item: Legend) => item.transform
                })
                .text((item: Legend) => item.text)
                .classed(Histogram.Legend.class, true);

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
                .filter((d, index) => index === 1)
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
                    transform: SVGUtil.translate(
                        this.viewport.width / 2,
                        this.viewport.height),
                    text: Histogram.getTailoredTextOrDefault(
                        settings.general.displayName,
                        this.viewportIn.width),
                    dx: "-0.5em",
                    dy: "-1em"
                }, {
                    transform: SVGUtil.translateAndRotate(
                        this.shouldShowYOnRight() ? this.yTitleMargin : 0,
                        this.viewport.height / 2,
                        0,
                        0,
                        270),
                    text: Histogram.getTailoredTextOrDefault(
                        bottomLegendText,
                        this.viewportIn.height),
                    dx: "3em"
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

        private calculateXAxes(
            source: DataViewMetadataColumn,
            textProperties: TextProperties,
            widthOfLabel: number,
            scrollbarVisible: boolean): IAxisProperties {

            let axes: IAxisProperties,
                width: number = this.viewportIn.width;

            axes = this.calculateXAxesProperties(
                Histogram.rangesToArray(this.dataView.dataPoints),
                axisScale.linear,
                source,
                Histogram.InnerPaddingRatio,
                widthOfLabel);

            axes.willLabelsFit = willLabelsFit(
                axes,
                width,
                TextMeasurementService.measureSvgTextWidth,
                textProperties);

            // If labels do not fit and we are not scrolling, try word breaking
            axes.willLabelsWordBreak = (!axes.willLabelsFit && !scrollbarVisible) && willLabelsWordBreak(
                axes, Histogram.Margin, width, TextMeasurementService.measureSvgTextWidth,
                TextMeasurementService.estimateSvgTextHeight, TextMeasurementService.getTailoredTextOrDefault,
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
                outerPadding: 0,
                isScalar: false,
                isVertical: false,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: true,
                getValueFn: (index, type) => index,
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
