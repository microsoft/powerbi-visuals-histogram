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

module powerbi.visuals.samples {
    // jsCommon
    import PixelConverter = jsCommon.PixelConverter;
    import IStringResourceProvider = jsCommon.IStringResourceProvider;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;

    // powerbi
    import IVisual = powerbi.IVisual;
    import ValueTypeDescriptor = powerbi.ValueTypeDescriptor;
    import ValueType = powerbi.ValueType;
    import IViewport = powerbi.IViewport;

    import IDataColorPalette = powerbi.IDataColorPalette;
    import TextProperties = powerbi.TextProperties;
    import VisualInitOptions = powerbi.VisualInitOptions;
    import IVisualStyle = powerbi.IVisualStyle;
    import DataView = powerbi.DataView;
    import Fill = powerbi.Fill;
    import VisualObjectInstance = powerbi.VisualObjectInstance;
    import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
    import DateTimeSequence = powerbi.DateTimeSequence;
    import DataViewScopeIdentity = powerbi.DataViewScopeIdentity;
    import DataViewObjects = powerbi.DataViewObjects;
    import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
    import NumberRange = powerbi.NumberRange;
    import TextMeasurementService = powerbi.TextMeasurementService;
    import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;
    import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
    import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

    // powerbi.extensibility.visual
    import IVisualHost = powerbi.extensibility.visual.IVisualHost;
    import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
    import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

    // powerbi.visuals
    import ValueFormatter = powerbi.visuals.valueFormatter;
    import IGenericAnimator = powerbi.visuals.IGenericAnimator;
    import IMargin = powerbi.visuals.IMargin;
    import TooltipEnabledDataPoint = powerbi.visuals.TooltipEnabledDataPoint;
    import SelectionId = powerbi.visuals.SelectionId;
    import IValueFormatter = powerbi.visuals.IValueFormatter;
    import axisStyle = powerbi.visuals.axisStyle;
    import yAxisPosition = powerbi.visuals.yAxisPosition;
    import DataColorPalette = powerbi.visuals.DataColorPalette;
    import TooltipDataItem = powerbi.visuals.TooltipDataItem;
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
    import ValueFormatterOptions = powerbi.visuals.ValueFormatterOptions;
    import IAxisProperties = powerbi.visuals.IAxisProperties;
    import IInteractiveBehavior = powerbi.visuals.IInteractiveBehavior;
    import ObjectEnumerationBuilder = powerbi.visuals.ObjectEnumerationBuilder;
    import ISelectionHandler = powerbi.visuals.ISelectionHandler;
    import IInteractivityService = powerbi.visuals.IInteractivityService;
    import appendClearCatcher = powerbi.visuals.appendClearCatcher;
    import createInteractivityService = powerbi.visuals.createInteractivityService;
    import SelectableDataPoint = powerbi.visuals.SelectableDataPoint;
    import ISize = powerbi.visuals.shapes.ISize;

    export interface HistogramAxisSettings {
        axisColor?: string;
        displayUnits?: number;
        precision?: number;
        title?: boolean;
        show?: boolean;
        style?: string;
    }

    export interface HistogramXAxisSettings extends HistogramAxisSettings { }

    export interface HistogramYAxisSettings extends HistogramAxisSettings {
        start?: number;
        end?: number;
        position?: string;
    }

    export interface HistogramLabelSettings {
        show?: boolean;
        color?: string;
        displayUnits?: number;
        precision?: number;
        fontSize?: number;
    }

    export interface HistogramSettings {
        displayName?: string;
        fillColor?: string;
        frequency: boolean;
        bins?: number;
        precision: number;

        xAxisSettings: HistogramXAxisSettings;
        yAxisSettings: HistogramYAxisSettings;
        labelSettings: HistogramLabelSettings;
    }

    export interface HistogramSubDataPoint extends SelectableDataPoint {
        highlight?: boolean;
    }

    export interface HistogramDataPoint extends
        D3.Layout.Bin,
        TooltipEnabledDataPoint {

        range: number[];
        subDataPoints: HistogramSubDataPoint[];
        size?: ISize;
    }

    export interface HistogramBorderValues {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    }

    export interface HistogramDataView {
        dataPoints: HistogramDataPoint[];

        borderValues: HistogramBorderValues;

        settings: HistogramSettings;
        formatter: IValueFormatter;

        xLegendSize: number;
        yLegendSize: number;

        xScale?: D3.Scale.LinearScale;
        yScale?: D3.Scale.LinearScale;

        xLabelFormatter?: IValueFormatter;
        yLabelFormatter?: IValueFormatter;
    }

    interface HistogramCalculateScaleAndDomainOptions {
        viewport: IViewport;
        margin: IMargin;
        showCategoryAxisLabel: boolean;
        showValueAxisLabel: boolean;
        forceMerge: boolean;
        categoryAxisScaleType: string;
        valueAxisScaleType: string;
        trimOrdinalDataOnOverflow: boolean;
        forcedTickCount?: number;
        forcedYDomain?: any[];
        forcedXDomain?: any[];
        ensureXDomain?: NumberRange;
        ensureYDomain?: NumberRange;
        categoryAxisDisplayUnits?: number;
        categoryAxisPrecision?: number;
        valueAxisDisplayUnits?: number;
        valueAxisPrecision?: number;
    }

    interface HistogramValue {
        value: number;
        selectionId: SelectionId;
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

    interface HistogramProperty {
        [propertyName: string]: DataViewObjectPropertyIdentifier;
    }

    interface HistogramProperties {
        [objectName: string]: HistogramProperty;
    }

    export class Histogram implements IVisual {
        private static ClassName: string = "histogram";
        private static FrequencyText: string = "Frequency";
        private static DensityText: string = "Density";

        private static Properties: HistogramProperties = {
            general: {
                bins: {
                    objectName: "general",
                    propertyName: "bins"
                },
                frequency: {
                    objectName: "general",
                    propertyName: "frequency"
                },
                formatString: {
                    objectName: "general",
                    propertyName: "formatString"
                }
            },
            dataPoint: {
                fill: {
                    objectName: "dataPoint",
                    propertyName: "fill"
                }
            },
            labels: {
                show: {
                    objectName: "labels",
                    propertyName: "show"
                },
                color: {
                    objectName: "labels",
                    propertyName: "color"
                },
                displayUnits: {
                    objectName: "labels",
                    propertyName: "displayUnits"
                },
                precision: {
                    objectName: "labels",
                    propertyName: "precision"
                },
                fontSize: {
                    objectName: "labels",
                    propertyName: "fontSize"
                }
            },
            xAxis: {
                show: {
                    objectName: "xAxis",
                    propertyName: "show"
                },
                axisColor: {
                    objectName: "xAxis",
                    propertyName: "axisColor"
                },
                title: {
                    objectName: "xAxis",
                    propertyName: "title"
                },
                displayUnits: {
                    objectName: "xAxis",
                    propertyName: "displayUnits"
                },
                precision: {
                    objectName: "xAxis",
                    propertyName: "precision"
                },
                style: {
                    objectName: "xAxis",
                    propertyName: "style"
                }
            },
            yAxis: {
                show: {
                    objectName: "yAxis",
                    propertyName: "show"
                },
                axisColor: {
                    objectName: "yAxis",
                    propertyName: "axisColor"
                },
                title: {
                    objectName: "yAxis",
                    propertyName: "title"
                },
                displayUnits: {
                    objectName: "yAxis",
                    propertyName: "displayUnits"
                },
                precision: {
                    objectName: "yAxis",
                    propertyName: "precision"
                },
                style: {
                    objectName: "yAxis",
                    propertyName: "style"
                },
                start: {
                    objectName: "yAxis",
                    propertyName: "start"
                },
                end: {
                    objectName: "yAxis",
                    propertyName: "end"
                },
                position: {
                    objectName: "yAxis",
                    propertyName: "position"
                }
            }
        };

        private static DefaultHistogramSettings: HistogramSettings = {
            frequency: true,
            displayName: "Histogram",
            bins: null,
            fillColor: "#01b8aa",
            precision: 2,
            xAxisSettings: {
                show: true,
                axisColor: "#777",
                title: true,
                displayUnits: 0,
                precision: 2,
                style: axisStyle.showTitleOnly,
            },
            yAxisSettings: {
                show: true,
                axisColor: "#777",
                title: true,
                displayUnits: 0,
                precision: 2,
                style: axisStyle.showTitleOnly,
                start: 0,
                position: yAxisPosition.left,
            },
            labelSettings: {
                show: false,
                color: "#777",
                displayUnits: 0,
                precision: 2,
                fontSize: 9
            },
        };

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

        private colors: IDataColorPalette;

        private root: D3.Selection;
        private clearCatcher: D3.Selection;
        private main: D3.Selection;
        private axes: D3.Selection;
        private axisX: D3.Selection;
        private axisY: D3.Selection;
        private legend: D3.Selection;
        private columns: D3.Selection;
        private labelGraphicsContext: D3.Selection;

        private dataView: HistogramDataView;

        private animator: IGenericAnimator;

        private get columnsSelection(): D3.Selection {
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

            this.root = d3.select(options.element)
                .append("svg");

            // var style: IVisualStyle = options.style;

            // this.colors = style && style.colorPalette
            //     ? style.colorPalette.dataColors
            //     : new DataColorPalette();

            this.clearCatcher = appendClearCatcher(this.root);

            this.root.classed(Histogram.ClassName, true);

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

        public static converter(dataView: DataView, colors: IDataColorPalette): HistogramDataView {
            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.categories ||
                !dataView.categorical.categories[0] ||
                !dataView.categorical.categories[0].values ||
                !(dataView.categorical.categories[0].values.length > 0) ||
                !colors) {
                return null;
            }

            var settings: HistogramSettings,
                categoryColumn: DataViewCategoryColumn = dataView.categorical.categories[0],
                queryName: string,
                histogramLayout: D3.Layout.HistogramLayout,
                values: HistogramValue[],
                numericalValues: number[] = [],
                bins: D3.Layout.Bin[],
                dataPoints: HistogramDataPoint[],
                valueFormatter: IValueFormatter,
                frequencies: number[] = [],
                identities: DataViewScopeIdentity[] = [],
                shiftByValues: number = 0,
                sumFrequency: number = 0,
                xLabelFormatter: IValueFormatter,
                yLabelFormatter: IValueFormatter,
                xLegendSize: number,
                yLegendSize: number,
                borderValues: HistogramBorderValues,
                yAxisSettings: HistogramYAxisSettings,
                sourceValues: number[] = <number[]>categoryColumn.values;

            settings = Histogram.parseSettings(dataView, colors);

            if (!settings
                || !Histogram.areValuesNumbers(categoryColumn)
                || sourceValues.length < Histogram.MinAmountOfValues) {

                return null;
            }

            xLegendSize = Histogram.getLegendSize(settings.xAxisSettings);
            yLegendSize = Histogram.getLegendSize(settings.yAxisSettings);

            if (dataView.categorical.values &&
                dataView.categorical.values[0] &&
                dataView.categorical.values[0].values) {
                frequencies = <number[]>dataView.categorical.values[0].values;
            }

            if (categoryColumn.identity
                && categoryColumn.identity.length > 0) {
                identities = categoryColumn.identity;
            }

            queryName = categoryColumn && categoryColumn.source
                ? categoryColumn.source.queryName
                : undefined;

            values = Histogram.getValuesByFrequencies(
                sourceValues,
                frequencies,
                identities,
                queryName);

            values.forEach((value: HistogramValue) => {
                numericalValues.push(value.value);
                sumFrequency += value.frequency;
            });

            histogramLayout = d3.layout.histogram();

            if (settings.bins && settings.bins > Histogram.MinNumberOfBins) {
                histogramLayout = histogramLayout.bins(settings.bins);
            }

            bins = histogramLayout.frequency(settings.frequency)(numericalValues);

            bins.forEach((bin: D3.Layout.Bin, index: number) => {
                var filteredValues: HistogramValue[],
                    frequency: number;

                filteredValues = values.filter((value: HistogramValue) => {
                    return Histogram.isValueContainedInRange(value, bin, index);
                });

                frequency = filteredValues.reduce((previousValue: number, currentValue: HistogramValue): number => {
                    return previousValue + currentValue.frequency;
                }, 0);

                bin.y = settings.frequency
                    ? frequency
                    : frequency / sumFrequency;

                shiftByValues += bin.length;
            });

            borderValues = Histogram.getBorderValues(bins);

            yAxisSettings = settings.yAxisSettings;

            var maxYvalue: number = (yAxisSettings.end !== null) && (yAxisSettings.end > yAxisSettings.start)
                ? yAxisSettings.end
                : borderValues.maxY;

            var minYValue: number = yAxisSettings.start < maxYvalue
                ? yAxisSettings.start
                : 0;

            settings.yAxisSettings.start = Histogram.getCorrectXAxisValue(minYValue);
            settings.yAxisSettings.end = Histogram.getCorrectXAxisValue(maxYvalue);

            if (values.length >= Histogram.MinAmountOfValues) {
                valueFormatter = ValueFormatter.create({
                    format: ValueFormatter.getFormatString(
                        dataView.categorical.categories[0].source,
                        Histogram.Properties["general"]["formatString"]),
                    value: values[0].value,
                    value2: values[values.length - 1].value,
                    precision: settings.precision
                });

                xLabelFormatter = ValueFormatter.create({
                    value: settings.xAxisSettings.displayUnits === 0
                        ? values[values.length - 1].value
                        : settings.xAxisSettings.displayUnits,
                    precision: settings.xAxisSettings.precision
                });

                yLabelFormatter = ValueFormatter.create({
                    value: settings.yAxisSettings.displayUnits,
                    precision: settings.yAxisSettings.precision
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
                dataPoints: dataPoints,
                borderValues: borderValues,
                settings: settings,
                formatter: valueFormatter,
                xLabelFormatter: xLabelFormatter,
                yLabelFormatter: yLabelFormatter,
                xLegendSize: xLegendSize,
                yLegendSize: yLegendSize
            };
        }

        public static getBorderValues(bins: D3.Layout.Bin[]): HistogramBorderValues {
            var borderValues: HistogramBorderValues = {
                minX: Number.MAX_VALUE,
                maxX: -Number.MAX_VALUE,
                minY: Number.MAX_VALUE,
                maxY: -Number.MAX_VALUE
            };

            bins.forEach((dataPoint: D3.Layout.Bin) => {
                var minX: number = Number.MAX_VALUE,
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
            sourceValues: number[],
            frequencies: number[],
            identities: DataViewScopeIdentity[],
            queryName: string): HistogramValue[] {

            var values: HistogramValue[] = [];

            sourceValues.forEach((item: number, index: number) => {
                var frequency: number = 1,
                    value: number = Number(item),
                    id: DataViewScopeIdentity = identities[index],
                    measureId: string,
                    selectionId: SelectionId;

                value = isNaN(value) ? 0 : value;

                measureId = id ? id.key : undefined;

                selectionId = SelectionId.createWithIdAndMeasureAndCategory(
                    id,
                    measureId,
                    queryName);

                if (frequencies
                    && frequencies[index]
                    && !isNaN(frequencies[index])
                    && frequencies[index] > 1) {
                    frequency = frequencies[index];
                }

                values.push({
                    value: value,
                    frequency: frequency,
                    selectionId: selectionId
                });
            });

            return values;
        }

        private static getDataPoints(
            values: HistogramValue[],
            numericalValues: number[],
            bins: D3.Layout.Bin[],
            settings: HistogramSettings,
            yValueFormatter: IValueFormatter,
            xValueFormatter: IValueFormatter): HistogramDataPoint[] {

            var fontSizeInPx: string = PixelConverter.fromPoint(settings.labelSettings.fontSize);

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
            xValueFormatter: IValueFormatter): TooltipDataItem[] {

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

            var dataPoints: SelectableDataPoint[] = [];

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

        private static isValueContainedInRange(value: HistogramValue, bin: D3.Layout.Bin, index: number): boolean {
            return ((index === 0 && value.value >= bin.x) || (value.value > bin.x)) && value.value <= bin.x + bin.dx;
        }

        private static parseSettings(dataView: DataView, colors: IDataColorPalette): HistogramSettings {
            if (!dataView ||
                !dataView.metadata ||
                !dataView.metadata.columns ||
                !dataView.metadata.columns[0]) {
                return null;
            }

            var histogramSettings: HistogramSettings = <HistogramSettings>{},
                objects: DataViewObjects,
                colorHelper: ColorHelper;

            colorHelper = new ColorHelper(
                colors,
                Histogram.Properties["dataPoint"]["fill"],
                Histogram.DefaultHistogramSettings.fillColor);

            histogramSettings.displayName =
                dataView.metadata.columns[0].displayName || Histogram.DefaultHistogramSettings.displayName;

            objects = Histogram.getObjectsFromDataView(dataView);

            var xAxisSettings: HistogramXAxisSettings = {
                axisColor: Histogram.getXAxisColor(objects).solid.color,
                title: Histogram.getXTitle(objects),
                precision: Histogram.getXPrecision(objects),
                style: Histogram.getXStyle(objects),
                displayUnits: Histogram.getXDisplayUnit(objects),
                show: Histogram.getXAxisShow(objects),
            };

            var yAxisSettings: HistogramYAxisSettings = {
                axisColor: Histogram.getYAxisColor(objects).solid.color,
                title: Histogram.getYTitle(objects),
                precision: Histogram.getYPrecision(objects),
                style: Histogram.getYStyle(objects),
                displayUnits: Histogram.getYDisplayUnit(objects),
                show: Histogram.getYAxisShow(objects),

                start: Histogram.getYStart(objects),
                end: Histogram.getYEnd(objects),
                position: Histogram.getYPosition(objects),
            };

            var labelSettings: HistogramLabelSettings = {
                show: Histogram.getLabelShow(objects),
                color: Histogram.getLabelColor(objects).solid.color,
                displayUnits: Histogram.getLabelDisplayUnits(objects),
                precision: Histogram.getLabelPrecision(objects),
                fontSize: Histogram.getLabelFontSize(objects),
            };

            histogramSettings.fillColor = colorHelper.getColorForMeasure(objects, "");
            histogramSettings.bins = Histogram.getBins(objects);
            histogramSettings.frequency = Histogram.getFrequency(objects);
            histogramSettings.precision = Histogram.getPrecision(objects);

            histogramSettings.displayName = Histogram.getLegend(
                histogramSettings.displayName,
                xAxisSettings.style,
                xAxisSettings.displayUnits);

            histogramSettings.xAxisSettings = xAxisSettings;
            histogramSettings.yAxisSettings = yAxisSettings;
            histogramSettings.labelSettings = labelSettings;

            return histogramSettings;
        }

        public static getLegend(title: string, style: string, displayUnit: number): string {
            var retValue: string,
                formatter: IValueFormatter;

            formatter = ValueFormatter.create({
                value: displayUnit
            });

            switch (style) {
                case axisStyle.showTitleOnly: {
                    retValue = title;

                    break;
                }
                case axisStyle.showUnitOnly: {
                    retValue = !(displayUnit === 0 || displayUnit === 1) && formatter.displayUnit
                        ? formatter.displayUnit.title
                        : title;

                    break;
                }
                case axisStyle.showBoth: {
                    retValue = !(displayUnit === 0 || displayUnit === 1) && formatter.displayUnit
                        ? title + " (" + formatter.displayUnit.title + ")"
                        : title;

                    break;
                }
            }

            return retValue;
        }

        private static getLabelFontSize(objects: DataViewObjects): number {
            return DataViewObjects.getValue<number>(
                objects,
                Histogram.Properties["labels"]["fontSize"],
                Histogram.DefaultHistogramSettings.labelSettings.fontSize
            );
        }

        private static getLabelShow(objects: DataViewObjects): boolean {
            return DataViewObjects.getValue<boolean>(
                objects,
                Histogram.Properties["labels"]["show"],
                Histogram.DefaultHistogramSettings.labelSettings.show
            );
        }

        private static getLabelColor(objects: DataViewObjects): Fill {
            return DataViewObjects.getValue<Fill>(
                objects,
                Histogram.Properties["labels"]["color"],
                {
                    solid: {
                        color: Histogram.DefaultHistogramSettings.labelSettings.color
                    }
                }
            );
        }

        private static getLabelDisplayUnits(objects: DataViewObjects): number {
            return DataViewObjects.getValue<number>(
                objects,
                Histogram.Properties["labels"]["displayUnits"],
                Histogram.DefaultHistogramSettings.labelSettings.displayUnits
            );
        }

        private static getLabelPrecision(objects: DataViewObjects): number {
            var precision: number = DataViewObjects.getValue(
                objects,
                Histogram.Properties["labels"]["precision"],
                Histogram.DefaultHistogramSettings.labelSettings.precision);

            if (precision <= Histogram.MinPrecision) {
                return Histogram.MinPrecision;
            } else if (precision >= Histogram.MaxPrecision) {
                return Histogram.MaxPrecision;
            }

            return precision;
        }

        private static getXStyle(objects: DataViewObjects): string {
            return DataViewObjects.getValue<string>(
                objects,
                Histogram.Properties["xAxis"]["style"],
                Histogram.DefaultHistogramSettings.xAxisSettings.style
            );
        }

        private static getXDisplayUnit(objects: DataViewObjects): number {
            return DataViewObjects.getValue<number>(
                objects,
                Histogram.Properties["xAxis"]["displayUnits"],
                Histogram.DefaultHistogramSettings.xAxisSettings.displayUnits
            );
        }

        private static getXPrecision(objects: DataViewObjects): number {
            var precision: number = DataViewObjects.getValue(
                objects,
                Histogram.Properties["xAxis"]["precision"],
                Histogram.DefaultHistogramSettings.xAxisSettings.precision);

            if (precision <= Histogram.MinPrecision) {
                return Histogram.MinPrecision;
            } else if (precision >= Histogram.MaxPrecision) {
                return Histogram.MaxPrecision;
            }

            return precision;
        }

        private static getXAxisShow(objects: DataViewObjects): boolean {
            return DataViewObjects.getValue<boolean>(
                objects,
                Histogram.Properties["xAxis"]["show"],
                Histogram.DefaultHistogramSettings.xAxisSettings.show
            );
        }

        private static getXAxisColor(objects: DataViewObjects): Fill {
            return DataViewObjects.getValue<Fill>(
                objects,
                Histogram.Properties["xAxis"]["axisColor"],
                {
                    solid: {
                        color: Histogram.DefaultHistogramSettings.xAxisSettings.axisColor
                    }
                }
            );
        }

        private static getXTitle(objects: DataViewObjects): boolean {
            return DataViewObjects.getValue<boolean>(
                objects,
                Histogram.Properties["xAxis"]["title"],
                Histogram.DefaultHistogramSettings.xAxisSettings.title);
        }

        private static getYStyle(objects: DataViewObjects): string {
            return DataViewObjects.getValue<string>(
                objects,
                Histogram.Properties["yAxis"]["style"],
                Histogram.DefaultHistogramSettings.yAxisSettings.style
            );
        }

        private static getYPosition(objects: DataViewObjects): string {
            return DataViewObjects.getValue<string>(
                objects,
                Histogram.Properties["yAxis"]["position"],
                Histogram.DefaultHistogramSettings.yAxisSettings.position
            );
        }

        private static getYAxisShow(objects: DataViewObjects): boolean {
            return DataViewObjects.getValue<boolean>(
                objects,
                Histogram.Properties["yAxis"]["show"],
                Histogram.DefaultHistogramSettings.yAxisSettings.show
            );
        }

        private static getYAxisColor(objects: DataViewObjects): Fill {
            return DataViewObjects.getValue<Fill>(
                objects,
                Histogram.Properties["yAxis"]["axisColor"],
                {
                    solid: {
                        color: Histogram.DefaultHistogramSettings.yAxisSettings.axisColor
                    }
                }
            );
        }

        private static getYStart(objects: DataViewObjects): number {
            return DataViewObjects.getValue<number>(
                objects,
                Histogram.Properties["yAxis"]["start"],
                Histogram.DefaultHistogramSettings.yAxisSettings.start
            );
        }

        private static getYEnd(objects: DataViewObjects): number {
            return DataViewObjects.getValue<number>(
                objects,
                Histogram.Properties["yAxis"]["end"],
                Histogram.DefaultHistogramSettings.yAxisSettings.end
            );
        }

        private static getYDisplayUnit(objects: DataViewObjects): number {
            return DataViewObjects.getValue<number>(
                objects,
                Histogram.Properties["yAxis"]["displayUnits"],
                Histogram.DefaultHistogramSettings.yAxisSettings.displayUnits
            );
        }

        private static getYPrecision(objects: DataViewObjects): number {
            var precision: number = DataViewObjects.getValue(
                objects,
                Histogram.Properties["yAxis"]["precision"],
                Histogram.DefaultHistogramSettings.yAxisSettings.precision
            );

            if (precision <= Histogram.MinPrecision) {
                return Histogram.MinPrecision;
            } else if (precision >= Histogram.MaxPrecision) {
                return Histogram.MaxPrecision;
            }

            return precision;
        }

        private static getYTitle(objects: DataViewObjects): boolean {
            return DataViewObjects.getValue<boolean>(
                objects,
                Histogram.Properties["yAxis"]["title"],
                Histogram.DefaultHistogramSettings.yAxisSettings.title);
        }

        private static getBins(objects: DataViewObjects): number {
            var binsNumber: number = Number(DataViewObjects.getValue<number>(
                objects,
                Histogram.Properties["general"]["bins"],
                Histogram.DefaultHistogramSettings.bins)
            );

            if (!binsNumber || isNaN(binsNumber) || (binsNumber <= Histogram.MinNumberOfBins)) {
                return Histogram.DefaultHistogramSettings.bins;
            }

            if (binsNumber > Histogram.MaxNumberOfBins) {
                return Histogram.MaxNumberOfBins;
            }

            return binsNumber;
        }

        private static getFrequency(objects: DataViewObjects): boolean {
            return DataViewObjects.getValue<boolean>(
                objects,
                Histogram.Properties["general"]["frequency"],
                Histogram.DefaultHistogramSettings.frequency
            );
        }

        private static getPrecision(objects: DataViewObjects): number {
            var precision: number = DataViewObjects.getValue(
                objects,
                Histogram.Properties["labels"]["precision"],
                Histogram.DefaultHistogramSettings.precision
            );

            if (precision <= Histogram.MinPrecision) {
                return Histogram.MinPrecision;
            }

            if (precision >= Histogram.MaxPrecision) {
                return Histogram.MaxPrecision;
            }

            return precision;
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

        public update(visualUpdateOptions: VisualUpdateOptions): void {
            if (!visualUpdateOptions ||
                !visualUpdateOptions.dataViews ||
                !visualUpdateOptions.dataViews[0]) {
                return;
            }

            var dataView: DataView = visualUpdateOptions.dataViews[0],
                maxWidthOfVerticalAxisLabel: number;

            this.setSize(visualUpdateOptions.viewport);

            this.dataView = Histogram.converter(dataView, this.colors);

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
            var maxWidthOfVerticalAxisLabel: number,
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

            var ySource = dataView.categorical.values &&
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
            var yAxisSettings: HistogramYAxisSettings = this.dataView.settings.yAxisSettings,
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
            var width: number,
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
            var countOfValues: number = this.dataView.dataPoints.length,
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
            ].forEach((selection: D3.Selection) => {
                this.clearElement(selection);
            });
        }

        private clearElement(selection: D3.Selection): void {
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

            var textProperties: TextProperties =
                Histogram.getTextPropertiesForMeasurement(labelValue, valueFormatter);

            return TextMeasurementService.measureSvgTextWidth(textProperties) + Histogram.AdditionalWidthOfLabel;
        }

        private static getHeightOfLabel(
            labelValue: number | string,
            valueFormatter: IValueFormatter): number {

            var textProperties: TextProperties =
                Histogram.getTextPropertiesForMeasurement(labelValue, valueFormatter);

            return TextMeasurementService.measureSvgTextHeight(textProperties) + Histogram.AdditionalHeightOfLabel;
        }

        private static getTextPropertiesForMeasurement(
            labelValue: string | number,
            valueFormatter?: IValueFormatter): TextProperties {

            var labelText: string;

            if (valueFormatter) {
                labelText = valueFormatter.format(labelValue);
            } else {
                labelText = <string>labelValue;
            }

            return Histogram.getTextProperties(labelText);
        }

        private setSize(viewport: IViewport): void {
            var height: number,
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
            var transform: string = SVGUtil.translate(
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
            return this.dataView.settings.yAxisSettings.position === yAxisPosition.right;
        }

        private columsAndAxesTransform(labelWidth: number): void {
            var offsetToRightStr: string,
                offsetToRight: number = this.shouldShowYOnRight()
                    ? Histogram.Margin.left
                    : this.dataView.settings.yAxisSettings.title
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
            var columnsSelection: D3.UpdateSelection = this.renderColumns();

            Histogram.bindTooltipsToSelection(columnsSelection);

            this.bindSelectionHandler(columnsSelection);

            this.renderLegend();

            this.renderLabels();
        }

        private renderColumns(): D3.UpdateSelection {
            var data: HistogramDataPoint[] = this.dataView.dataPoints,
                xScale: D3.Scale.LinearScale = this.dataView.xScale,
                yScale: D3.Scale.LinearScale = this.dataView.yScale,
                updateColumnsSelection: D3.UpdateSelection;

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
                    "height": (item: HistogramDataPoint) => {
                        return this.getColumnHeight(item, yScale);
                    }
                })
                .style("fill", this.dataView.settings.fillColor);

            histogramUtils.updateFillOpacity(
                updateColumnsSelection,
                this.interactivityService,
                false);

            updateColumnsSelection
                .exit()
                .remove();

            return updateColumnsSelection;
        }

        private static bindTooltipsToSelection(selection: D3.UpdateSelection): void {
            TooltipManager.addTooltip(selection, (tooltipEvent: TooltipEvent) => {
                return (<HistogramDataPoint>tooltipEvent.data).tooltipInfo;
            });
        }

        private getColumnHeight(column: D3.Layout.Bin, y: D3.Scale.LinearScale): number {
            var height: number = this.viewportIn.height - y(column.y);

            return Math.max(height, Histogram.MinColumnHeight);
        }

        private renderXAxis(): void {
            var xAxis: D3.Svg.Axis,
                xShow: boolean = this.dataView.settings.xAxisSettings.show,
                axisColor: string = this.dataView.settings.xAxisSettings.axisColor;

            xAxis = this.xAxisProperties.axis
                .tickFormat((value: number, index: number) => {
                    var tickValues: any[] = this.xAxisProperties.axis.tickValues(),
                        amountOfLabels: number = (tickValues && tickValues.length) || 0;

                    return this.formatLabelOfXAxis(value, index, amountOfLabels);
                })
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
            var maxWidthOfTheLatestLabel: number,
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
            var textProperties = Histogram.getTextProperties(text);

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
            var yAxis: D3.Svg.Axis,
                yShow: boolean = this.dataView.settings.yAxisSettings.show,
                axisColor: string = this.dataView.settings.yAxisSettings.axisColor;

            yAxis = this.yAxisProperties.axis
                .orient(this.dataView.settings.yAxisSettings.position.toLowerCase())
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

        private updateFillColorOfAxis(axisSelection: D3.Selection, fillColor: string): void {
            axisSelection
                .selectAll("g.tick text")
                .style({
                    "fill": fillColor
                });
        }

        private getLabelLayout(): ILabelLayout {
            var labelSettings: HistogramLabelSettings = this.dataView.settings.labelSettings,
                fontSizeInPx: string = PixelConverter.fromPoint(labelSettings.fontSize),
                fontFamily: string = dataLabelUtils.LabelTextProperties.fontFamily,
                xScale: D3.Scale.LinearScale = this.dataView.xScale,
                yScale: D3.Scale.LinearScale = this.dataView.yScale,
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
                        var x: number,
                            dx: number;

                        x = xScale(dataPoint.x);
                        dx = dataPoint.size.width / Histogram.DataLabelXOffset - this.widthOfColumn / 2;

                        return x - dx;
                    },
                    y: (dataPoint: HistogramDataPoint) => {
                        var y: number,
                            dy: number;

                        y = yScale(dataPoint.y);
                        dy = dataPoint.size.height;

                        return y - dy;
                    }
                },
                filter: (dataPoint: HistogramDataPoint) => {
                    return (dataPoint != null);
                },
                style: {
                    "fill": labelSettings.color,
                    "font-size": fontSizeInPx,
                    "font-family": fontFamily
                }
            };
        }

        private renderLabels(): void {
            var labelSettings: HistogramLabelSettings = this.dataView.settings.labelSettings,
                dataPointsArray: HistogramDataPoint[] = this.dataView.dataPoints,
                labels: D3.UpdateSelection;

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
                    var size: ISize = dataPoint.size,
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
                var range: number[];

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

            var leftBracket: string,
                rightBracket: string = Histogram.IncludeBrackets.right,
                leftBorder: string = valueFormatter.format(range[0]),
                rightBorder: string = valueFormatter.format(range[1]);

            leftBracket = includeLeftBorder
                ? Histogram.IncludeBrackets.left
                : Histogram.ExcludeBrackets.left;

            return `${leftBracket}${leftBorder}${Histogram.SeparatorNumbers}${rightBorder}${rightBracket}`;
        }

        private renderLegend(): void {
            var legendElements: D3.Selection,
                legendSelection: D3.UpdateSelection,
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
                    "display": Histogram.getDispayForAxisTitle(this.dataView.settings.xAxisSettings)
                });

            this.legend
                .selectAll("text")
                .filter((d, index) => index === 1)
                .style({
                    "display": Histogram.getDispayForAxisTitle(this.dataView.settings.yAxisSettings)
                });
        }

        private static getDispayForAxisTitle(axisSettings: HistogramAxisSettings): string {
            return axisSettings && axisSettings.title
                ? null
                : "none";
        }

        private getDataLegends(settings: HistogramSettings): Legend[] {
            var bottomLegendText: string = Histogram.getLegendText(settings);

            bottomLegendText = Histogram.getLegend(
                bottomLegendText,
                settings.yAxisSettings.style,
                settings.yAxisSettings.displayUnits);

            return [
                {
                    transform: SVGUtil.translate(
                        this.viewport.width / 2,
                        this.viewport.height),
                    text: Histogram.getTailoredTextOrDefault(
                        settings.displayName,
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
            return settings.frequency
                ? Histogram.FrequencyText
                : Histogram.DensityText;
        }

        private bindSelectionHandler(columnsSelection: D3.UpdateSelection): void {
            if (!this.interactivityService
                || !this.dataView
                || !this.dataView.dataPoints) {

                return;
            }

            var subDataPoints: SelectableDataPoint[] = [];

            this.dataView.dataPoints.forEach((dataPoint: HistogramDataPoint) => {
                subDataPoints = subDataPoints.concat(dataPoint.subDataPoints);
            });

            var behaviorOptions: HistogramBehaviorOptions = {
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
            var enumeration: ObjectEnumerationBuilder = new ObjectEnumerationBuilder(),
                settings: HistogramSettings;

            if (!this.dataView ||
                !this.dataView.settings) {
                return [];
            }

            settings = this.dataView.settings;

            switch (options.objectName) {
                case "general": {
                    this.enumerateGeneral(enumeration, settings);

                    break;
                }
                case "dataPoint": {
                    this.enumerateDataPoint(enumeration, settings);

                    break;
                }
                case "labels": {
                    this.enumerateLabels(enumeration, settings);

                    break;
                }
                case "xAxis": {
                    this.enumerateXAxis(enumeration, settings);

                    break;
                }
                case "yAxis": {
                    this.enumerateYAxis(enumeration, settings);

                    break;
                }
            }

            return enumeration.complete() || [];
        }

        private enumerateGeneral(
            enumeration: ObjectEnumerationBuilder,
            settings: HistogramSettings): void {

            var general: VisualObjectInstance = {
                objectName: "general",
                displayName: "general",
                selector: null,
                properties: {
                    bins: settings.bins,
                    frequency: settings.frequency
                }
            };

            enumeration.pushInstance(general);
        }

        private enumerateDataPoint(
            enumeration: ObjectEnumerationBuilder,
            settings: HistogramSettings): void {

            var dataPoint: VisualObjectInstance = {
                objectName: "dataPoint",
                displayName: "dataPoint",
                selector: null,
                properties: {
                    fill: settings.fillColor
                }
            };

            enumeration.pushInstance(dataPoint);
        }

        private enumerateLabels(
            enumeration: ObjectEnumerationBuilder,
            settings: HistogramSettings): void {

            var labelsSettings: HistogramLabelSettings = settings.labelSettings,
                labels: VisualObjectInstance = {
                    objectName: "labels",
                    displayName: "labels",
                    selector: null,
                    properties: {
                        show: labelsSettings.show,
                        color: labelsSettings.color,
                        displayUnits: labelsSettings.displayUnits,
                        precision: labelsSettings.precision,
                        fontSize: labelsSettings.fontSize
                    }
                };

            enumeration.pushInstance(labels);
        }

        private enumerateXAxis(
            enumeration: ObjectEnumerationBuilder,
            settings: HistogramSettings): void {

            var xAxisSettings: HistogramXAxisSettings = settings.xAxisSettings,
                xAxis: VisualObjectInstance = {
                    objectName: "xAxis",
                    displayName: "X-Axis",
                    selector: null,
                    properties: {
                        show: xAxisSettings.show,
                        title: xAxisSettings.title,
                        style: xAxisSettings.style,
                        axisColor: xAxisSettings.axisColor,
                        displayUnits: xAxisSettings.displayUnits,
                        precision: xAxisSettings.precision,
                    }
                };

            enumeration.pushInstance(xAxis);
        }

        private enumerateYAxis(
            enumeration: ObjectEnumerationBuilder,
            settings: HistogramSettings): void {

            var yAxisSettings: HistogramYAxisSettings = settings.yAxisSettings,
                yAxis: VisualObjectInstance = {
                    objectName: "yAxis",
                    displayName: "Y-Axis",
                    selector: null,
                    properties: {
                        show: yAxisSettings.show,
                        position: yAxisSettings.position,
                        start: yAxisSettings.start,
                        end: yAxisSettings.end,
                        title: yAxisSettings.title,
                        style: yAxisSettings.style,
                        axisColor: yAxisSettings.axisColor,
                        displayUnits: yAxisSettings.displayUnits,
                        precision: yAxisSettings.precision,
                    }
                };

            enumeration.pushInstance(yAxis);
        }

        private static getObjectsFromDataView(dataView: DataView): DataViewObjects {
            if (!dataView ||
                !dataView.metadata ||
                !dataView.metadata.columns ||
                !dataView.metadata.objects) {
                return null;
            }

            return dataView.metadata.objects;
        }

        public destroy(): void {
            this.root = null;
        }

        private calculateXAxes(
            source: DataViewMetadataColumn,
            textProperties: TextProperties,
            widthOfLabel: number,
            scrollbarVisible: boolean): IAxisProperties {

            var axes: IAxisProperties,
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

            var xAxisProperties = HistogramAxisHelper.createAxis({
                pixelSpan: this.viewportIn.width,
                dataDomain: forcedXDomain,
                metaDataColumn: metaDataColumn,
                formatString: valueFormatter.getFormatString(
                    metaDataColumn,
                    Histogram.Properties["general"]["formatString"]),
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

            xAxisProperties.axisLabel = this.dataView.settings.displayName;

            return xAxisProperties;
        }

        private calculateYAxes(
            source: DataViewMetadataColumn,
            heightOfLabel: number): IAxisProperties {

            var yAxisSettings: HistogramYAxisSettings = this.dataView.settings.yAxisSettings;

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

            var formatString: string = undefined;

            if (this.dataView.settings.frequency) {
                formatString = valueFormatter.getFormatString(
                    metaDataColumn,
                    Histogram.Properties["general"]["formatString"]);
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
                getValueFn: (index, type) => index,
                scaleType: categoryAxisScaleType,
                innerPaddingRatio: innerPaddingRatio,
                minOrdinalRectThickness: minOrdinalRectThickness,
                tickLabelPadding: undefined,
                is100Pct: true
            });
        }
    }

    /**
     * HistogramAxisHelper based on AxisHelper (Visuals/common/axisHelper.ts).
     */
    export module HistogramAxisHelper {
        import NumberFormat = powerbi.NumberFormat;
        import BaseCreateAxisOptions = powerbi.visuals.CreateAxisOptions;

        /**
         * Default ranges are for when we have a field chosen for the axis,
         * but no values are returned by the query.
         */
        export var emptyDomain = [0, 0];

        var InnerPaddingRatio: number = 0.2;
        var TickLabelPadding: number = 2; // between text labels, used by AxisHelper
        var MinOrdinalRectThickness: number = 20;

        var ScalarTickLabelPadding: number = 3;
        var MinTickCount: number = 2;
        var DefaultBestTickCount: number = 3;

        export interface CreateScaleResult {
            scale: D3.Scale.GenericScale<any>;
            bestTickCount: number;
            usingDefaultDomain?: boolean;
        }

        export interface CreateAxisOptions extends BaseCreateAxisOptions {
            innerPaddingRatio: number;
            tickLabelPadding: number;
            minOrdinalRectThickness: number;
        }

        /**
         * Create a D3 axis including scale. Can be vertical or horizontal, and either datetime, numeric, or text.
         * @param options The properties used to create the axis.
         */
        export function createAxis(options: CreateAxisOptions): IAxisProperties {
            var pixelSpan = options.pixelSpan,
                dataDomain = options.dataDomain,
                metaDataColumn = options.metaDataColumn,
                formatString = options.formatString,
                outerPadding = options.outerPadding || 0,
                isCategoryAxis = !!options.isCategoryAxis,
                isScalar = !!options.isScalar,
                isVertical = !!options.isVertical,
                useTickIntervalForDisplayUnits = !!options.useTickIntervalForDisplayUnits, // DEPRECATE: same meaning as isScalar?
                getValueFn = options.getValueFn,
                categoryThickness = options.categoryThickness,
                axisDisplayUnits = options.axisDisplayUnits,
                axisPrecision = options.axisPrecision,
                is100Pct = !!options.is100Pct,
                tickLabelPadding: number = options.tickLabelPadding || TickLabelPadding;

            var dataType: ValueType = getCategoryValueType(metaDataColumn, isScalar);

            // Create the Scale
            var scaleResult: CreateScaleResult = createScale(options);
            var scale = scaleResult.scale;
            var bestTickCount = scaleResult.bestTickCount;
            var scaleDomain = scale.domain();
            var isLogScaleAllowed = isLogScalePossible(dataDomain, dataType);

            // fix categoryThickness if scalar and the domain was adjusted when making the scale "nice"
            if (categoryThickness && isScalar && dataDomain && dataDomain.length === 2) {
                var oldSpan = dataDomain[1] - dataDomain[0];
                var newSpan = scaleDomain[1] - scaleDomain[0];
                if (oldSpan > 0 && newSpan > 0) {
                    categoryThickness = categoryThickness * oldSpan / newSpan;
                }
            }

            // Prepare Tick Values for formatting
            var tickValues: any[];
            if (isScalar && bestTickCount === 1) {
                tickValues = [dataDomain[0]];
            }
            else {
                var minTickInterval = isScalar ? getMinTickValueInterval(formatString, dataType, is100Pct) : undefined;
                tickValues = getRecommendedTickValues(bestTickCount, scale, dataType, isScalar, minTickInterval);
            }

            if (options.scaleType && options.scaleType === axisScale.log && isLogScaleAllowed) {
                tickValues = tickValues.filter((d) => { return powerOfTen(d); });
            }

            var formatter = createFormatter(
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
            var axis = d3.svg.axis()
                .scale(scale)
                .tickSize(6, 0)
                .orient(isVertical ? "left" : "bottom")
                .ticks(bestTickCount)
                .tickValues(tickValues);

            var formattedTickValues = [];
            if (metaDataColumn)
                formattedTickValues = formatAxisTickValues(axis, tickValues, formatter, dataType, getValueFn);

            var xLabelMaxWidth;
            // Use category layout of labels if specified, otherwise use scalar layout of labels
            if (!isScalar && categoryThickness) {
                xLabelMaxWidth = Math.max(1, categoryThickness - tickLabelPadding * 2);
            }
            else {
                // When there are 0 or 1 ticks, then xLabelMaxWidth = pixelSpan
                xLabelMaxWidth = tickValues.length > 1 ? getScalarLabelMaxWidth(scale, tickValues) : pixelSpan;
                xLabelMaxWidth = xLabelMaxWidth - ScalarTickLabelPadding * 2;
            }

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

        /**
         * Indicates whether the number is power of 10.
         */
        export function powerOfTen(d: any): boolean {
            var value = Math.abs(d);
            // formula log2(Y)/log2(10) = log10(Y)
            // because double issues this won"t return exact value
            // we need to ceil it to nearest number.
            var log10: number = Math.log(value) / Math.LN10;
            log10 = Math.ceil(log10 - 1e-12);
            return value / Math.pow(10, log10) === 1;
        }

        function getScalarLabelMaxWidth(scale: D3.Scale.GenericScale<any>, tickValues: number[]): number {
            debug.assertValue(scale, "scale");
            debug.assertNonEmpty(tickValues, "tickValues");
            // find the distance between two ticks. scalar ticks can be anywhere, such as:
            // |---50----------100--------|
            if (scale && !_.isEmpty(tickValues)) {
                return Math.abs(scale(tickValues[1]) - scale(tickValues[0]));
            }

            return 1;
        }

        export function createFormatter(
            scaleDomain: any[],
            dataDomain: any[],
            dataType,
            isScalar: boolean,
            formatString: string,
            bestTickCount: number,
            tickValues: any[],
            getValueFn: any,
            useTickIntervalForDisplayUnits: boolean = false,
            axisDisplayUnits?: number,
            axisPrecision?: number): IValueFormatter {

            var formatter: IValueFormatter;
            if (dataType.dateTime) {
                if (isScalar) {
                    var value = new Date(scaleDomain[0]);
                    var value2 = new Date(scaleDomain[1]);
                    // datetime with only one value needs to pass the same value
                    // (from the original dataDomain value, not the adjusted scaleDomain)
                    // so formatting works correctly.
                    if (bestTickCount === 1)
                        value = value2 = new Date(dataDomain[0]);
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
                if (getValueFn == null && !isScalar) {
                    debug.assertFail("getValueFn must be supplied for ordinal tickValues");
                }
                if (useTickIntervalForDisplayUnits && isScalar && tickValues.length > 1) {
                    var value1 = axisDisplayUnits ? axisDisplayUnits : tickValues[1] - tickValues[0];

                    var options: ValueFormatterOptions = {
                        format: formatString,
                        value: value1,
                        value2: 0, //force tickInterval or display unit to be used
                        allowFormatBeautification: true,
                    };

                    if (axisPrecision)
                        options.precision = axisPrecision;
                    else
                        options.precision = AxisHelper.calculateAxisPrecision(tickValues[0], tickValues[1], axisDisplayUnits, formatString);

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
            var isCustomFormat = formatString && !NumberFormat.isStandardFormat(formatString);
            if (isCustomFormat) {
                var precision = NumberFormat.getCustomFormatMetadata(formatString, true /*calculatePrecision*/).precision;
                if (formatString.indexOf("%") > -1)
                    precision += 2; //percent values are multiplied by 100 during formatting
                return Math.pow(10, -precision);
            }
            else if (is100Pct)
                return 0.01;
            else if (columnType.integer)
                return 1;

            return 0;
        }

        /**
         * Format the linear tick labels or the category labels.
         */
        function formatAxisTickValues(
            axis: D3.Svg.Axis,
            tickValues: any[],
            formatter: IValueFormatter,
            dataType: ValueType,
            getValueFn?: (index: number, type: ValueType) => any) {

            var formattedTickValues = [];

            if (!getValueFn)
                getValueFn = data => data;

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
            if (domain == null)
                return false;
            if (isDateTime(axisType))
                return false;

            return (domain[0] > 0 && domain[1] > 0) || (domain[0] < 0 && domain[1] < 0);//doman must exclude 0
        }

        export function isDateTime(type: ValueTypeDescriptor): boolean {
            return !!(type && type.dateTime);
        }

        export function getRecommendedTickValues(maxTicks: number,
            scale: D3.Scale.GenericScale<any>,
            axisType: ValueType,
            isScalar: boolean,
            minTickInterval?: number): any[] {

            if (!isScalar || isOrdinalScale(scale)) {
                return getRecommendedTickValuesForAnOrdinalRange(maxTicks, scale.domain());
            }
            else if (isDateTime(axisType)) {
                return getRecommendedTickValuesForADateTimeRange(maxTicks, scale.domain());
            }

            return getRecommendedTickValuesForAQuantitativeRange(maxTicks, scale, minTickInterval);
        }

        export function getRecommendedTickValuesForAnOrdinalRange(maxTicks: number, labels: string[]): string[] {
            var tickLabels: string[] = [];

            // return no ticks in this case
            if (maxTicks <= 0)
                return tickLabels;

            var len = labels.length;
            if (maxTicks > len)
                return labels;

            for (var i = 0, step = Math.ceil(len / maxTicks); i < len; i += step) {
                tickLabels.push(labels[i]);
            }
            return tickLabels;
        }

        export function getRecommendedTickValuesForAQuantitativeRange(maxTicks: number, scale: D3.Scale.GenericScale<any>, minInterval?: number): number[] {
            var tickLabels: number[] = [];

            //if maxticks is zero return none
            if (maxTicks === 0)
                return tickLabels;

            var quantitiveScale = <D3.Scale.QuantitativeScale>scale;
            if (quantitiveScale.ticks) {
                tickLabels = quantitiveScale.ticks(maxTicks);
                if (tickLabels.length > maxTicks && maxTicks > 1)
                    tickLabels = quantitiveScale.ticks(maxTicks - 1);
                if (tickLabels.length < MinTickCount) {
                    tickLabels = quantitiveScale.ticks(maxTicks + 1);
                }
                tickLabels = createTrueZeroTickLabel(tickLabels);

                if (minInterval && tickLabels.length > 1) {
                    var tickInterval = tickLabels[1] - tickLabels[0];
                    while (tickInterval > 0 && tickInterval < minInterval) {
                        for (var i = 1; i < tickLabels.length; i++) {
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

            debug.assertFail("must pass a quantitative scale to this method");

            return tickLabels;
        }

        function getRecommendedTickValuesForADateTimeRange(maxTicks: number, dataDomain: number[]): number[] {
            var tickLabels: number[] = [];

            if (dataDomain[0] === 0 && dataDomain[1] === 0)
                return [];

            var dateTimeTickLabels = DateTimeSequence.calculate(new Date(dataDomain[0]), new Date(dataDomain[1]), maxTicks).sequence;
            tickLabels = dateTimeTickLabels.map(d => d.getTime());
            tickLabels = ensureValuesInRange(tickLabels, dataDomain[0], dataDomain[1]);
            return tickLabels;
        }

        export function isOrdinalScale(scale: any): boolean {
            return typeof scale.invert === "undefined";
        }

        /**
         * Gets the ValueType of a category column, defaults to Text if the type is not present.
         */
        export function getCategoryValueType(metadataColumn: DataViewMetadataColumn, isScalar?: boolean): ValueType {
            if (metadataColumn && columnDataTypeHasValue(metadataColumn.type))
                return <ValueType>metadataColumn.type;

            if (isScalar) {
                return ValueType.fromDescriptor({ numeric: true });
            }

            return ValueType.fromDescriptor({ text: true });
        }

        export function columnDataTypeHasValue(dataType: ValueTypeDescriptor) {
            return dataType && (dataType.bool || dataType.numeric || dataType.text || dataType.dateTime);
        }

        export function createScale(options: CreateAxisOptions): CreateScaleResult {
            var pixelSpan = options.pixelSpan,
                dataDomain = options.dataDomain,
                metaDataColumn = options.metaDataColumn,
                outerPadding = options.outerPadding || 0,
                isScalar = !!options.isScalar,
                isVertical = !!options.isVertical,
                forcedTickCount = options.forcedTickCount,
                categoryThickness = options.categoryThickness,
                shouldClamp = !!options.shouldClamp,
                maxTickCount = options.maxTickCount,
                innerPaddingRatio: number = options.innerPaddingRatio || InnerPaddingRatio,
                minOrdinalRectThickness: number = options.minOrdinalRectThickness || MinOrdinalRectThickness;

            var dataType: ValueType = getCategoryValueType(metaDataColumn, isScalar);

            var maxTicks = isVertical
                ? getRecommendedNumberOfTicksForYAxis(pixelSpan)
                : getRecommendedNumberOfTicksForXAxis(pixelSpan);

            if (maxTickCount &&
                maxTicks > maxTickCount)
                maxTicks = maxTickCount;

            var scalarDomain = dataDomain ? dataDomain.slice() : null;
            var bestTickCount = maxTicks;
            var scale: D3.Scale.GenericScale<any>;
            var usingDefaultDomain = false;

            if (dataDomain == null || (dataDomain.length === 2 && dataDomain[0] == null && dataDomain[1] == null) || (dataDomain.length !== 2 && isScalar)) {
                usingDefaultDomain = true;

                if (dataType.dateTime || !isOrdinal(dataType))
                    dataDomain = emptyDomain;
                else //ordinal
                    dataDomain = [];

                if (isOrdinal(dataType)) {
                    scale = createOrdinalScale(
                        pixelSpan,
                        dataDomain,
                        innerPaddingRatio,
                        categoryThickness ? outerPadding / categoryThickness : 0);
                }
                else {
                    scale = createNumericalScale(options.scaleType, pixelSpan, dataDomain, dataType, outerPadding, bestTickCount);
                }
            }
            else {
                if (isScalar && dataDomain.length > 0) {
                    bestTickCount = forcedTickCount !== undefined
                        ? (maxTicks !== 0 ? forcedTickCount : 0)
                        : getBestNumberOfTicks(dataDomain[0], dataDomain[dataDomain.length - 1], [metaDataColumn], maxTicks, dataType.dateTime);

                    var normalizedRange = normalizeLinearDomain({ min: dataDomain[0], max: dataDomain[dataDomain.length - 1] });
                    scalarDomain = [normalizedRange.min, normalizedRange.max];
                }

                if (isScalar && dataType.numeric && !dataType.dateTime) {
                    //Note: Don't pass bestTickCount to createNumericalScale, because it overrides boundaries of the domain.
                    scale = createNumericalScale(options.scaleType, pixelSpan, scalarDomain, dataType, outerPadding, /*bestTickCount*/null, shouldClamp);

                    bestTickCount = maxTicks === 0
                        ? 0
                        : Math.floor((pixelSpan - outerPadding * 2) / minOrdinalRectThickness);
                }
                else if (isScalar && dataType.dateTime) {
                    // Use of a linear scale, instead of a D3.time.scale, is intentional since we want
                    // to control the formatting of the time values, since d3"s implementation isn"t
                    // in accordance to our design.
                    //     scalarDomain: should already be in long-int time (via category.values[0].getTime())
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
                else {
                    debug.assertFail("unsupported dataType, something other than text or numeric");
                }
            }

            // vertical ordinal axis (e.g. categorical bar chart) does not need to reverse
            if (isVertical && isScalar) {
                scale.range(scale.range().reverse());
            }

            normalizeInfinityInScale(scale);

            return {
                scale: scale,
                bestTickCount: bestTickCount,
                usingDefaultDomain: usingDefaultDomain,
            };
        }

        export function normalizeInfinityInScale(scale: D3.Scale.GenericScale<any>): void {
            // When large values (eg Number.MAX_VALUE) are involved, a call to scale.nice occasionally
            // results in infinite values being included in the domain. To correct for that, we need to
            // re-normalize the domain now to not include infinities.
            var scaledDomain = scale.domain();
            for (var i = 0, len = scaledDomain.length; i < len; ++i) {
                if (scaledDomain[i] === Number.POSITIVE_INFINITY)
                    scaledDomain[i] = Number.MAX_VALUE;
                else if (scaledDomain[i] === Number.NEGATIVE_INFINITY)
                    scaledDomain[i] = -Number.MAX_VALUE;
            }

            scale.domain(scaledDomain);
        }

        export function createOrdinalScale(
            pixelSpan: number,
            dataDomain: any[],
            innerPaddingRatio: number,
            outerPaddingRatio: number): D3.Scale.OrdinalScale {

            debug.assert(outerPaddingRatio >= 0 && outerPaddingRatio < 4, "outerPaddingRatio should be a value between zero and four");

            var scale = d3.scale.ordinal()
                /* Avoid using rangeRoundBands here as it is adding some extra padding to the axis*/
                .rangeBands([0, pixelSpan], innerPaddingRatio, outerPaddingRatio)
                .domain(dataDomain);
            return scale;
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

        //this function can return different scales e.g. log, linear
        // NOTE: export only for testing, do not access directly
        export function createNumericalScale(
            axisScaleType: string,
            pixelSpan: number,
            dataDomain: any[],
            dataType: ValueType,
            outerPadding: number = 0,
            niceCount?: number,
            shouldClamp?: boolean): D3.Scale.GenericScale<any> {

            if (axisScaleType === axisScale.log && isLogScalePossible(dataDomain, dataType)) {
                return createLogScale(pixelSpan, dataDomain, outerPadding, niceCount);
            }
            else {
                return createLinearScale(pixelSpan, dataDomain, outerPadding, niceCount, shouldClamp);
            }
        }

        function createLogScale(pixelSpan: number, dataDomain: any[], outerPadding: number = 0, niceCount?: number): D3.Scale.LinearScale {
            debug.assert(isLogScalePossible(dataDomain), "dataDomain cannot include 0");
            var scale = d3.scale.log()
                .range([outerPadding, pixelSpan - outerPadding])
                .domain([dataDomain[0], dataDomain[1]])
                .clamp(true);

            if (niceCount) {
                scale.nice(niceCount);
            }

            return scale;
        }

        // NOTE: export only for testing, do not access directly
        export function createLinearScale(pixelSpan: number, dataDomain: any[], outerPadding: number = 0, niceCount?: number, shouldClamp?: boolean): D3.Scale.LinearScale {
            var scale = d3.scale.linear()
                .range([outerPadding, pixelSpan - outerPadding])
                .domain([dataDomain[0], dataDomain[1]])
                .clamp(shouldClamp);
            // .nice(undefined) still modifies the scale boundaries, and for datetime this messes things up.
            // we use millisecond ticks since epoch for datetime, so we don"t want any "nice" with numbers like 17398203392.
            if (niceCount) {
                scale.nice(niceCount);
            }
            return scale;
        }

        export function getRecommendedNumberOfTicksForXAxis(availableWidth: number) {
            if (availableWidth < 300) {
                return 3;
            }

            if (availableWidth < 500) {
                return 5;
            }

            return 8;
        }

        export function getRecommendedNumberOfTicksForYAxis(availableWidth: number) {
            if (availableWidth < 150) {
                return 3;
            }

            if (availableWidth < 300) {
                return 5;
            }

            return 8;
        }

        export function isOrdinal(type: ValueTypeDescriptor): boolean {
            return !!(type && (type.text || type.bool || (type.misc && type.misc.barcode) || (type.geography && type.geography.postalCode)));
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
        export function getBestNumberOfTicks(min: number, max: number, valuesMetadata: DataViewMetadataColumn[], maxTickCount: number, isDateTime?: boolean): number {
            debug.assert(maxTickCount >= 0, "maxTickCount must be greater or equal to zero");

            if (isNaN(min) || isNaN(max))
                return DefaultBestTickCount;

            debug.assert(min <= max, "min value needs to be less or equal to max value");

            if (maxTickCount <= 1 || (max <= 1 && min >= -1))
                return maxTickCount;

            if (min === max) {
                // datetime needs to only show one tick value in this case so formatting works correctly
                if (!!isDateTime)
                    return 1;
                return DefaultBestTickCount;
            }

            if (hasNonIntegerData(valuesMetadata))
                return maxTickCount;

            // e.g. 5 - 2 + 1 = 4, => [2,3,4,5]
            return Math.min(max - min + 1, maxTickCount);
        }

        export function ensureValuesInRange(values: number[], min: number, max: number): number[] {
            debug.assert(min <= max, "min must be less or equal to max");
            var filteredValues = values.filter(v => v >= min && v <= max);
            if (filteredValues.length < 2)
                filteredValues = [min, max];
            return filteredValues;
        }

        export function hasNonIntegerData(valuesMetadata: DataViewMetadataColumn[]): boolean {
            for (var i = 0, len = valuesMetadata.length; i < len; i++) {
                var currentMetadata = valuesMetadata[i];
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
            if (!ticks || ticks.length < 2)
                return ticks;

            var closeZero = epsilon * Math.abs(ticks[1] - ticks[0]);

            return ticks.map((tick) => Math.abs(tick) <= closeZero ? 0 : tick);
        }
    }

    export interface HistogramBehaviorOptions {
        columns: D3.Selection;
        clearCatcher: D3.Selection;
        interactivityService: IInteractivityService;
    }

    export class HistogramBehavior implements IInteractiveBehavior {
        private columns: D3.Selection;
        private selectedDataPoints: SelectableDataPoint[];
        private clearCatcher: D3.Selection;
        private interactivityService: IInteractivityService;

        public static create(): IInteractiveBehavior {
            return new HistogramBehavior();
        }

        public bindEvents(
            behaviorOptions: HistogramBehaviorOptions,
            selectionHandler: ISelectionHandler): void {

            this.columns = behaviorOptions.columns;
            this.interactivityService = behaviorOptions.interactivityService;
            this.clearCatcher = behaviorOptions.clearCatcher;

            this.columns.on("click", (dataPoint: HistogramDataPoint) => {
                selectionHandler.handleClearSelection();

                if (!HistogramBehavior.areDataPointsSelected(this.selectedDataPoints, dataPoint.subDataPoints)) {
                    dataPoint.subDataPoints.forEach((subDataPoint: SelectableDataPoint) => {
                        selectionHandler.handleSelection(subDataPoint, true);
                    });

                    this.selectedDataPoints = dataPoint.subDataPoints;
                } else {
                    this.createAnEmptySelectedDataPoints();
                }
            });

            this.clearCatcher.on("click", () => {
                selectionHandler.handleClearSelection();
                this.createAnEmptySelectedDataPoints();
            });
        }

        public renderSelection(hasSelection: boolean) {
            histogramUtils.updateFillOpacity(
                this.columns,
                this.interactivityService,
                hasSelection);
        }

        public static areDataPointsSelected(
            selectedDataPoints: SelectableDataPoint[],
            dataPoints: SelectableDataPoint[]): boolean {
            if (!dataPoints
                || !selectedDataPoints
                || dataPoints.length !== selectedDataPoints.length) {

                return false;
            }

            return selectedDataPoints.every((selectedDataPoint: SelectableDataPoint) => {
                return dataPoints.some((dataPoint: SelectableDataPoint) => {
                    return selectedDataPoint
                        && dataPoint
                        && selectedDataPoint.identity
                        && dataPoint.identity
                        && selectedDataPoint.identity.equals(dataPoint.identity);
                });
            });
        }

        private createAnEmptySelectedDataPoints(): void {
            this.selectedDataPoints = [];
        }
    }

    export interface StateOfDataPoint {
        selected: boolean;
        highlight: boolean;
    }

    export module histogramUtils {
        export var DimmedOpacity: number = 0.4;
        export var DefaultOpacity: number = 1.0;

        export function getFillOpacity(
            selected: boolean,
            highlight: boolean,
            hasSelection: boolean,
            hasPartialHighlights: boolean): number {

            if ((hasPartialHighlights && !highlight) || (hasSelection && !selected)) {
                return DimmedOpacity;
            }

            return DefaultOpacity;
        }

        export function getStateOfDataPoint(dataPoint: HistogramDataPoint): StateOfDataPoint {
            var selected: boolean = false,
                highlight: boolean = false;

            if (dataPoint.subDataPoints && dataPoint.subDataPoints.length > 0) {
                dataPoint.subDataPoints.forEach((subDataPoint: HistogramSubDataPoint) => {
                    selected = selected || subDataPoint.selected;
                    highlight = highlight || subDataPoint.highlight;
                });
            }

            return {
                selected: selected,
                highlight: highlight
            };
        }

        export function updateFillOpacity(
            columns: D3.Selection,
            interactivityService?: IInteractivityService,
            hasSelection: boolean = false): void {
            var hasHighlights: boolean = false;

            if (interactivityService) {
                hasHighlights = interactivityService.hasSelection();
            }

            columns.style("fill-opacity", (dataPoint: HistogramDataPoint) => {
                var selectedDataPoint: StateOfDataPoint = histogramUtils.getStateOfDataPoint(dataPoint);

                return histogramUtils.getFillOpacity(
                    selectedDataPoint.selected,
                    selectedDataPoint.highlight,
                    !selectedDataPoint.highlight && hasSelection,
                    !selectedDataPoint.selected && hasHighlights);
            });
        }
    }
}
