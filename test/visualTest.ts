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
import capabilities from '../capabilities.json';
import { bin } from "d3-array";
import last from "lodash.last";

import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import { HistogramData } from "./visualData";
import { areColorsEqual, getSolidColorStructuralObject } from "./helpers";
import { HistogramChartBuilder } from "./visualBuilder";

import { manipulation } from "powerbi-visuals-utils-svgutils";
import parseTranslateTransform = manipulation.parseTranslateTransform;

import { assertColorsMatch } from "powerbi-visuals-utils-testutils";

import { Visual as VisualClass } from "../src/visual";
import { HistogramDataPoint } from "../src/dataInterfaces";
import { HistogramAxisStyle, HistogramGeneralSettings } from "../src/settings";
import * as histogramUtils from "../src/utils";
import * as Default from "../src/constants";

import StateOfDataPoint = histogramUtils.StateOfDataPoint;

describe("HistogramChart", () => {
    describe("DOM tests", () => {
        let visualBuilder: HistogramChartBuilder,
            dataViewBuilder: HistogramData,
            dataView: DataView;

        beforeEach(() => {
            visualBuilder = new HistogramChartBuilder(1000, 500);
            dataViewBuilder = new HistogramData();

            dataView = dataViewBuilder.getDataView();
        });

        it("svg element created", () => {
            expect(visualBuilder.mainElement).toBeTruthy();
        });

        it("update", (done) => {
            visualBuilder.updateRenderTimeout(dataView, () => {
                const binsNumber: number = bin()(
                    dataView.categorical!.categories![0].values as number[]
                ).length;

                expect(visualBuilder.mainElement?.querySelectorAll(".column").length).toBe(binsNumber);

                done();
            });
        });

        it("update with one category", (done) => {
            dataView.categorical!.categories![0].values = [1];
            dataView.categorical!.values = undefined;

            visualBuilder.updateRenderTimeout(dataView, () => {
                const binsNumber: number = bin()(
                    dataView.categorical!.categories![0].values as number[]
                ).length;

                expect(visualBuilder.mainElement?.querySelectorAll(".column").length).toBe(binsNumber);

                done();
            });
        });

        it("data labels position validation", (done) => {
            dataViewBuilder.categoryColumnValues = [
                10, 11, 12, 15, 16, 20,
                21, 25, 26, 27, 28, 29,
                30, 31, 40, 50, 60, 70
            ];

            dataViewBuilder.valuesColumnValues = [
                7, 6, 10, 4, 3, 3,
                3, 6, 10, 4, 1, 7,
                9, 2, 9, 4, 5, 7
            ];

            dataView = dataViewBuilder.getDataView();

            dataView.metadata.objects = {
                labels: {
                    show: true
                }
            };

            visualBuilder.updateRenderTimeout(dataView, () => {
                const labels: Element[] = Array.from(visualBuilder.labelTexts);

                labels.forEach((label: Element) => {
                    let x: number,
                        y: number,
                        dx: number,
                        dy: number,
                        transform: { x: string, y: string },
                        currentX: number,
                        currentY: number;

                    x = Number(label.getAttribute("x"));
                    y = Number(label.getAttribute("y"));

                    transform = parseTranslateTransform(label.getAttribute("transform")!);

                    dx = Number(transform.x);
                    dy = Number(transform.y);

                    currentX = x + dx;
                    currentY = y + dy;

                    expect(currentX).toBeGreaterThan(0);
                    expect(currentY).toBeGreaterThan(0);

                    expect(currentX).toBeLessThan(visualBuilder.viewport.width);
                    expect(currentY).toBeLessThan(visualBuilder.viewport.height);

                    done();
                });
            });
        });

        it("X-axis the latest labels should contain three dots when the precision is 17", (done) => {
            dataView.metadata.objects = {
                xAxis: {
                    precision: 17
                }
            };

            visualBuilder.updateRenderTimeout(dataView, () => {
                const labels = visualBuilder.xAxis?.querySelectorAll(".tick text");

                expectTextContainsThreeDots(Array.from(labels!)[0]?.textContent ?? "");
                expectTextContainsThreeDots(Array.from(labels!)[labels!.length - 1].textContent ?? "");

                done();
            });

            function expectTextContainsThreeDots(text: string): void {
                expect(text).toMatch("...");
            }
        });

        it("Y-axis start > end validation", () => {
            dataView.metadata.objects = {
                yAxis: {
                    start: 65,
                    end: 33
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(parseFloat(Array.from(visualBuilder.yAxisTicks!).at(0)!.textContent!)).toBe(0);
        });

        it("Y-axis start < 0 validation", () => {
            dataView.metadata.objects = {
                yAxis: {
                    start: -52,
                    end: 78
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(parseFloat(Array.from(visualBuilder.yAxisTicks!).at(0)!.textContent!)).toBe(0);
        });

        it("Y-axis end < 0 validation", () => {
            dataView.metadata.objects = {
                yAxis: {
                    start: 0,
                    end: -78
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(parseFloat(Array.from(visualBuilder.yAxisTicks!).at(0)!.textContent!)).toBe(0);
            expect(parseFloat(Array.from(visualBuilder.yAxisTicks!).at(-1)!.textContent!)).toBeGreaterThanOrEqual(0);
        });

        it("Y-axis start is undefined validation", () => {
            dataView.metadata.objects = {
                yAxis: {
                    start: {},
                    end: 78
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(parseFloat(Array.from(visualBuilder.yAxisTicks!).at(0)!.textContent!)).toBe(0);
        });

        it("Y-axis end is undefined validation", () => {
            dataView.metadata.objects = {
                yAxis: {
                    start: 0,
                    end: {}
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(parseFloat(Array.from(visualBuilder.yAxisTicks!).at(0)!.textContent!)).toBe(0);
            expect(parseFloat(Array.from(visualBuilder.yAxisTicks!).at(-1)!.textContent!)).toBeGreaterThanOrEqual(0);
        });

        it("X-axis default ticks", () => {
            dataViewBuilder.categoryColumnValues = [
                9, 10, 11, 12, 13, 14
            ];

            dataViewBuilder.valuesColumnValues = [
                772, 878, 398, 616, 170, 267,
            ];

            dataView = dataViewBuilder.getDataView();

            dataView.metadata.objects = {
                xAxis: {
                    start: 9,
                    end: 14
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(visualBuilder.xAxisTicks.length).toBe(7);
            expect(parseFloat(Array.from(visualBuilder.xAxisTicks!).at(0)!.textContent!)).toBe(9);
        });

        it("X-axis start is lesser than min", () => {
            dataViewBuilder.categoryColumnValues = [
                9, 10, 11, 12, 13, 14
            ];

            dataViewBuilder.valuesColumnValues = [
                772, 878, 398, 616, 170, 267,
            ];

            dataView = dataViewBuilder.getDataView();

            dataView.metadata.objects = {
                xAxis: {
                    start: 7.2,
                    end: 14
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(visualBuilder.xAxisTicks.length).toBe(10);
            expect(parseFloat(Array.from(visualBuilder.xAxisTicks!).at(0)!.textContent!)).toBe(6.5);
        });

        it("X-axis end is greater than max and bins=7", () => {
            dataViewBuilder.categoryColumnValues = [
                9, 10, 11, 12, 13, 14
            ];

            dataViewBuilder.valuesColumnValues = [
                772, 878, 398, 616, 170, 267,
            ];

            dataView = dataViewBuilder.getDataView();

            dataView.metadata.objects = {
                xAxis: {
                    start: 9,
                    end: 17.34
                },
                general: {
                    bins: 7
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(visualBuilder.xAxisTicks.length).toBe(13);
            expect(parseFloat(Array.from(visualBuilder.xAxisTicks!).at(-1)!.textContent!)).toBe(17.57);
        });

        it("X-axis start is greater than min and bins=7", () => {
            dataViewBuilder.categoryColumnValues = [
                9, 10, 11, 12, 13, 14
            ];

            dataViewBuilder.valuesColumnValues = [
                772, 878, 398, 616, 170, 267,
            ];

            dataView = dataViewBuilder.getDataView();

            dataView.metadata.objects = {
                xAxis: {
                    start: 10,
                    end: 14
                },
                general: {
                    bins: 7
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(visualBuilder.xAxisTicks.length).toBe(7);
            expect(parseFloat(Array.from(visualBuilder.xAxisTicks!).at(0)!.textContent!)).toBe(9.71);
        });

        it("X-axis end is lesser than max and bins=12", () => {
            dataViewBuilder.categoryColumnValues = [
                9, 10, 11, 12, 13, 14
            ];

            dataViewBuilder.valuesColumnValues = [
                772, 878, 398, 616, 170, 267,
            ];

            dataView = dataViewBuilder.getDataView();

            dataView.metadata.objects = {
                xAxis: {
                    start: 9,
                    end: 12
                },
                general: {
                    bins: 12
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(visualBuilder.xAxisTicks.length).toBe(9);
            expect(parseFloat(Array.from(visualBuilder.xAxisTicks!).at(-1)!.textContent!)).toBe(12.33);
        });

        it("X-axis end is lesser than max and bins=6 and periodic number case", () => {
            dataViewBuilder.categoryColumnValues = [
                9, 10, 11, 12, 13, 14
            ];

            dataViewBuilder.valuesColumnValues = [
                772, 878, 398, 616, 170, 267,
            ];

            dataView = dataViewBuilder.getDataView();

            dataView.metadata.objects = {
                xAxis: {
                    start: 9,
                    end: 13
                },
                general: {
                    bins: 6
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(visualBuilder.xAxisTicks.length).toBe(6);
            expect(parseFloat(Array.from(visualBuilder.xAxisTicks!).at(0)!.textContent!)).toBe(9);
            expect(parseFloat(Array.from(visualBuilder.xAxisTicks!).at(-1)!.textContent!)).toBe(13.17);
        });

        it("X-axis start is greater than max", () => {
            dataViewBuilder.categoryColumnValues = [
                9, 10, 11, 12, 13, 14
            ];

            dataViewBuilder.valuesColumnValues = [
                772, 878, 398, 616, 170, 267,
            ];

            dataView = dataViewBuilder.getDataView();

            dataView.metadata.objects = {
                xAxis: {
                    start: 17
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(parseFloat(Array.from(visualBuilder.xAxisTicks!).at(0)!.textContent!)).toBe(9);
        });

        it("X-axis end is lesser than min", () => {
            dataViewBuilder.categoryColumnValues = [
                9, 10, 11, 12, 13, 14
            ];

            dataViewBuilder.valuesColumnValues = [
                772, 878, 398, 616, 170, 267,
            ];

            dataView = dataViewBuilder.getDataView();

            dataView.metadata.objects = {
                xAxis: {
                    start: 9,
                    end: 14
                }
            };

            visualBuilder.updateFlushAllD3Transitions(dataView);

            expect(parseFloat(Array.from(visualBuilder.xAxisTicks!).at(-1)!.textContent!)).toBe(14);
        });
    });

    describe("Format settings test", () => {
        let visualBuilder: HistogramChartBuilder,
            dataViewBuilder: HistogramData,
            dataView: DataView;

        beforeEach(() => {
            visualBuilder = new HistogramChartBuilder(1000, 500);
            dataViewBuilder = new HistogramData();

            dataView = dataViewBuilder.getDataView();
        });

        describe("General", () => {
            it("frequency", () => {
                dataView.metadata.objects = {
                    general: {
                        frequency: false
                    }
                };

                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.yAxisTicks.length).toBeGreaterThan(1);
            });

            it("bins", () => {
                let bins: number = 3;

                dataView.metadata.objects = {
                    general: { bins: bins }
                };

                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.columns!.length).toBe(bins);

                bins = 6;

                (dataView.metadata.objects as any).general.bins = bins;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.columns!.length).toBe(bins);
            });

            it("bins count change triggers update of bin size", () => {
                VisualClass.CurrentBinsCount = 5;
                VisualClass.CurrentBinSize = 0.6;

                let binsCount: number = 4;
                let isBinSizeEnabled = true;
                let numericalValues: number[] = [3, 4, 5, 6];

                dataView.metadata.objects = {
                    general: { 
                        bins: binsCount,
                        binSize: VisualClass.CurrentBinSize,
                        isBinSizeEnabled: isBinSizeEnabled
                    }
                };

                let binsSettings = VisualClass.GET_BINS_SETTINGS(binsCount, VisualClass.CurrentBinSize, isBinSizeEnabled, numericalValues);

                expect(binsSettings.shouldUpdateBinSize).toBe(true);
                expect(binsSettings.binValues.binSize).toBe(0.75);
                expect(binsSettings.binValues.bins.length).toBe(4);
            });

            it("bin size change triggers update of bins count", () => {
                VisualClass.CurrentBinsCount = 5;
                VisualClass.CurrentBinSize = 0.6;

                let binSize: number = 2;
                let isBinSizeEnabled = true;
                let numericalValues: number[] = [3, 4, 5, 6];

                dataView.metadata.objects = {
                    general: { 
                        bins: VisualClass.CurrentBinsCount,
                        binSize: binSize,
                        isBinSizeEnabled: isBinSizeEnabled
                    }
                };

                let binsSettings = VisualClass.GET_BINS_SETTINGS(VisualClass.CurrentBinsCount, binSize, isBinSizeEnabled, numericalValues);

                expect(binsSettings.shouldUpdateBinSize).toBe(false);
                expect(binsSettings.binValues.binSize).toBe(2);
                expect(binsSettings.binValues.bins.length).toBe(2);
            });

            for (let { name, count } of [
                {
                    name: 'zero',
                    count: 0
                }, 
                {
                    name: 'negative',
                    count: -5
                }
            ]) {
                it(`if bins count is ${name} bin size is changed to default value`, () => {
                    VisualClass.CurrentBinsCount = 5;
                    VisualClass.CurrentBinSize = 0.6;
    
                    let binsCount: number = count;
                    let isBinSizeEnabled = true;
                    let numericalValues: number[] = [3, 4, 5, 6];
    
                    dataView.metadata.objects = {
                        general: { 
                            bins: binsCount,
                            binSize: VisualClass.CurrentBinSize,
                            isBinSizeEnabled: isBinSizeEnabled
                        }
                    };
    
                    let binsSettings = VisualClass.GET_BINS_SETTINGS(binsCount, VisualClass.CurrentBinSize, isBinSizeEnabled, numericalValues);
                    let expectedInterval = Math.max(...numericalValues) - Math.min(...numericalValues);
    
                    expect(binsSettings.shouldUpdateBinSize).toBe(true);
                    expect(binsSettings.binValues.binSize).toBe(HistogramGeneralSettings.MinBinSize);
                    expect(binsSettings.binValues.bins.length).toBe(expectedInterval);
                });
            }
        });

        describe("Data colors", () => {
            it("color", () => {
                const color: string = "#ABCDEF",
                    evenColor: string = "#AACCEE";

                dataView.metadata.objects = {
                    dataPoint: {
                        fill: getSolidColorStructuralObject(color),
                        fillEven: getSolidColorStructuralObject(evenColor)
                    }
                };

                visualBuilder.updateFlushAllD3Transitions(dataView);

                Array.from(visualBuilder.columns!)
                    .forEach((element, index) => { // TODO TYPE
                        assertColorsMatch(getComputedStyle(element)["fill"], (index % 2) ? color : evenColor);
                    });
            });
        });

        describe("X-axis", () => {
            beforeEach(() => {
                dataView.metadata.objects = {
                    xAxis: {
                        show: true
                    }
                };
            });

            it("show", () => {
                (dataView.metadata.objects as any).xAxis.show = true;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.xAxisTicks).toBeTruthy();

                (dataView.metadata.objects as any).xAxis.show = false;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.xAxisTicks?.length).toBe(0);
            });

            it("display Units", () => {
                const displayUnits: number = 1000;

                (dataView.metadata.objects as any).xAxis.displayUnits = displayUnits;

                visualBuilder.updateFlushAllD3Transitions(dataView);

                Array.from(visualBuilder.xAxisTicks!)
                    .forEach((element) => {
                        expect(last(element.textContent)).toEqual("K");
                    });
            });

            it("title", () => {
                (dataView.metadata.objects as any).xAxis.title = true;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.xAxisLabel.forEach(l => expect(getComputedStyle(l)["display"]).not.toBe("none"));

                (dataView.metadata.objects as any).xAxis.title = false;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.xAxisLabel.forEach(l => expect(getComputedStyle(l)["display"]).toBe("none"));
            });
        });

        describe("Y-axis", () => {
            beforeEach(() => {
                dataView.metadata.objects = {
                    yAxis: {
                        show: true
                    }
                };
            });

            it("show", () => {
                (dataView.metadata.objects as any).yAxis.show = true;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.yAxisTicks).toBeTruthy();

                (dataView.metadata.objects as any).yAxis.show = false;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.yAxisTicks?.length).toBe(0);
            });

            it("display Units", () => {
                const displayUnits: number = 1000;

                (dataView.metadata.objects as any).yAxis.displayUnits = displayUnits;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                Array.from(visualBuilder.yAxisTicks!)
                    .forEach((element) => {// TODO TYPE
                        expect(last(element.textContent)).toEqual("K");
                    });
            });

            it("title", () => {
                (dataView.metadata.objects as any).yAxis.title = true;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.yAxisLabel.forEach(l => expect(getComputedStyle(l)["display"]).not.toBe("none"));

                (dataView.metadata.objects as any).yAxis.title = false;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.yAxisLabel.forEach(l => expect(getComputedStyle(l)["display"]).toBe("none"));
            });

            it("position", () => {
                (dataView.metadata.objects as any).yAxis.position = "Left";
                visualBuilder.updateFlushAllD3Transitions(dataView);

                const xLeft: number = getAxisTranslate(visualBuilder);

                (dataView.metadata.objects as any).yAxis.position = "Right";
                visualBuilder.updateFlushAllD3Transitions(dataView);

                const xRight: number = getAxisTranslate(visualBuilder);

                expect(xRight).toBeGreaterThan(xLeft);
            });

            function getAxisTranslate(visualBuilder: HistogramChartBuilder): number {
                // TODO REVIEW return d3.transition(visualBuilder.yAxis.attr("transform")).translate[0];
                return Number(parseTranslateTransform(visualBuilder.yAxis.getAttribute("transform")!).x);
            }
        });

        describe("Data labels", () => {
            beforeEach(() => {
                dataView.metadata.objects = {
                    labels: {
                        show: true
                    }
                };
            });

            it("show", () => {
                (dataView.metadata.objects as any).labels.show = true;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.labelTexts).toBeTruthy();
                expect(visualBuilder.columns.length).toBe(visualBuilder.labelTexts.length);

                (dataView.metadata.objects as any).labels.show = false;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.labelTexts.length).toBe(0);
            });

            it("display units", () => {
                let displayUnits: number = 1000;

                (dataView.metadata.objects as any).labels.displayUnits = displayUnits;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                Array.from(visualBuilder.labelTexts!)
                    .forEach((element) => {// TODO TYPE
                        expect(last(element.textContent)).toEqual("K");
                    });

                displayUnits = 1000 * 1000;

                (dataView.metadata.objects as any).labels.displayUnits = displayUnits;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                Array.from(visualBuilder.labelTexts!)
                    .forEach((element) => {// TODO TYPE
                        expect(last(element.textContent)).toEqual("M");
                    });
            });

            it("precision", () => {
                const precision: number = 7;

                (dataView.metadata.objects as any).labels.displayUnits = 1;
                (dataView.metadata.objects as any).labels.precision = precision;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                Array.from(visualBuilder.labelTexts!)
                    .forEach((element) => {// TODO TYPE
                        expect(element.textContent!.split(".")[1].length).toEqual(precision);
                    });
            });

            it("font-size", () => {
                const fontSize: number = 22,
                    expectedFontSize: string = "29.3333px";

                (dataView.metadata.objects as any).labels.fontSize = fontSize;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                Array.from(visualBuilder.labelTexts!)
                    .forEach((element) => {// TODO TYPE
                        expect(getComputedStyle(element)["font-size"]).toBe(expectedFontSize);
                    });
            });
        });
    });

    describe("getLegendTextWithUnits", () => {
        it("getLegendTextWithUnits should return the title without any modifications", () => {
            let title: string = "Power BI",
                legendTitle: string;

            legendTitle = VisualClass.GET_LEGEND_TEXT_WITH_UNITS(title, HistogramAxisStyle.showTitleOnly, 0);

            expect(legendTitle).toBe(title);
        });

        it("getLegendTextWithUnits shouldn't throw any exceptions when axisStyle.showUnitOnly and displayUnits is NaN", () => {
            expect(() => {
                VisualClass.GET_LEGEND_TEXT_WITH_UNITS("Power BI", HistogramAxisStyle.showUnitOnly, NaN);
            }).not.toThrow();
        });

        it("getLegendTextWithUnits shouldn't throw any exceptions when axisStyle.showBoth and displayUnits is NaN", () => {
            expect(() => {
                VisualClass.GET_LEGEND_TEXT_WITH_UNITS("Power BI", HistogramAxisStyle.showBoth, NaN);
            }).not.toThrow();
        });
    });

    describe("calculateXAxes", () => {
        let visualBuilder: HistogramChartBuilder;
        let dataViewBuilder: HistogramData;

        beforeEach(() => {
            visualBuilder = new HistogramChartBuilder(1000, 500);
            dataViewBuilder = new HistogramData();
        });

        it("should not fall into infinity loop if there is just one data point", (done) => {
            const dataView: DataView = dataViewBuilder.getDataView(undefined, 1);

            dataView.metadata.objects = {
                xAxis: {
                    start: 0,
                }
            };

            visualBuilder.updateRenderTimeout(dataView, () => {
                expect(dataView).toBeDefined();

                done();
            });
        });
    });

    describe("isIntervalValid", () => {
        let visualBuilder: HistogramChartBuilder;

        beforeEach(() => {
            visualBuilder = new HistogramChartBuilder(1000, 500);
        });

        it("should return true if interval is greater than zero", () => {
            expect(VisualClass.isIntervalValid(1)).toBeTruthy();
        });

        it("should return false if interval is less than zero", () => {
            expect(VisualClass.isIntervalValid(-1)).toBeFalsy();
        });

        it("should return false if interval is zero", () => {
            expect(VisualClass.isIntervalValid(0)).toBeFalsy();
        });
    });

    describe("areValuesNumbers", () => {
        it("the method should return true when category is integer", () => {
            let areValuesNumbers: boolean,
                categoryColumn = createCategoryColumn(true);

            areValuesNumbers = VisualClass.ARE_VALUES_NUMBERS(categoryColumn);

            expect(areValuesNumbers).toBeTruthy();
        });

        it("the method should return true when category is numeric", () => {
            let areValuesNumbers: boolean,
                categoryColumn = createCategoryColumn(undefined, true);

            areValuesNumbers = VisualClass.ARE_VALUES_NUMBERS(categoryColumn);

            expect(areValuesNumbers).toBeTruthy();
        });

        it("the method should return false when category isn't numeric or integer", () => {
            let areValuesNumbers: boolean,
                categoryColumn = createCategoryColumn();

            areValuesNumbers = VisualClass.ARE_VALUES_NUMBERS(categoryColumn);

            expect(areValuesNumbers).toBeFalsy();
        });

        function createCategoryColumn(
            isInteger: boolean | undefined = undefined,
            isNumeric: boolean | undefined = undefined): DataViewCategoryColumn {

            return {
                source: {
                    displayName: "",
                    type: {
                        integer: isInteger,
                        numeric: isNumeric
                    }
                },
                values: []
            };
        }
    });

    describe("getCorrectYAxisValue", () => {
        it("the method should return a value that equals MaxXAxisEndValue", () => {
            checkCorrectYAxisValue(Number.MAX_VALUE, Default.MaxXAxisEndValue);
        });

        it("the method should return a value that equals MinXAxisStartValue", () => {
            checkCorrectYAxisValue(-Number.MAX_VALUE, 0);
        });

        it("the method should return the same value", () => {
            const value: number = 42;

            checkCorrectYAxisValue(value, value);
        });

        it("the method should return a 0 if value is undefined ", () => {
            checkCorrectYAxisValue(undefined, 0);
        });

        it("the method should return a 0 if value is NaN ", () => {
            checkCorrectYAxisValue(parseInt("someString"), 0);
        });

        function checkCorrectYAxisValue(
            actualValue: number | undefined,
            expectedValue: number): void {

            const value: number = actualValue
                ? VisualClass.GET_CORRECT_Y_AXIS_VALUE(actualValue)
                : 0;

            expect(value).toBe(expectedValue);
        }
    });

    describe("getCorrectXAxisValue", () => {
        it("the method should return a value that equals MaxXAxisEndValue", () => {
            checkCorrectXAxisValue(Number.MAX_VALUE, Default.MaxXAxisEndValue);
        });

        it("the method should return a value that equals MinXAxisStartValue", () => {
            checkCorrectXAxisValue(-Number.MAX_VALUE, Default.MinXAxisStartValue);
        });

        it("the method should return the same value", () => {
            const value: number = 42;

            checkCorrectXAxisValue(value, value);
        });

        it("the method should return a 0 if value is undefined ", () => {
            checkCorrectXAxisValue(undefined, 0);
        });

        it("the method should return a 0 if value is NaN ", () => {
            checkCorrectXAxisValue(parseInt("someString"), 0);
        });

        function checkCorrectXAxisValue(
            actualValue: number | undefined,
            expectedValue: number): void {

            const value: number = actualValue
                ? VisualClass.GET_CORRECT_X_AXIS_VALUE(actualValue)
                : 0;

            expect(value).toBe(expectedValue);
        }
    });

    describe("histogramUtils", () => {
        describe("getFillOpacity", () => {
            it("method should return DimmedOpacity when hasSelection is true, selected is false", () => {
                let fillOpacity: number;

                fillOpacity = histogramUtils.getOpacity(false, false, true, false);

                expect(fillOpacity).toBe(histogramUtils.DimmedOpacity);
            });

            it("method should return DefaultOpacity when hasSelection is true, selected is true", () => {
                let fillOpacity: number;

                fillOpacity = histogramUtils.getOpacity(true, false, true, false);

                expect(fillOpacity).toBe(histogramUtils.DefaultOpacity);
            });
        });

        describe("getStateOfDataPoint", () => {
            it("method should return { selected: false, highlight: false } when the dataPoint isn't selected", () => {
                checkStateOfDataPoint(false, false);
            });

            it("method should return { selected: true, highlight: true } when the dataPoint is selected", () => {
                checkStateOfDataPoint(true, true);
            });

            it("method should return { selected: true, highlight: false } when the dataPoint is selected", () => {
                checkStateOfDataPoint(true, false);
            });

            function checkStateOfDataPoint(selected: boolean, highlight: boolean): void {
                let dataPoint: HistogramDataPoint = createDataPoint(selected, highlight),
                    stateOfDataPoint: StateOfDataPoint;

                stateOfDataPoint = histogramUtils.getStateOfDataPoint(dataPoint);

                expect(stateOfDataPoint.selected).toBe(selected);
                expect(stateOfDataPoint.highlight).toBe(highlight);
            }

            function createDataPoint(selected: boolean, highlight: boolean): HistogramDataPoint {
                let dataPoint: HistogramDataPoint = <HistogramDataPoint>{};

                dataPoint.subDataPoints = [{
                    selected: selected,
                    highlight: highlight,
                    identity: {}
                }];

                return dataPoint;
            }
        });
    });

    describe("Capabilities tests", () => {
        it("all items that have displayName should have displayNameKey property", () => {
            let objectsChecker: Function = (obj) => {
                for (let property in obj) {
                    let value: any = obj[property];

                    if (value.displayName) {
                        expect(value.displayNameKey).toBeDefined();
                    }

                    if (typeof value === "object") {
                        objectsChecker(value);
                    }
                }
            };

            objectsChecker(capabilities.objects);
        });
    });

    describe("Accessibility", () => {
        let visualBuilder: HistogramChartBuilder;
        let dataViewBuilder: HistogramData;
        let dataView: DataView;

        beforeEach(() => {
            visualBuilder = new HistogramChartBuilder(1000, 500);
            dataViewBuilder = new HistogramData();

            dataView = dataViewBuilder.getDataView();
        });

        describe("High contrast mode", () => {
            const backgroundColor: string = "#000000";
            const foregroundColor: string = "#ffff00";

            beforeEach(() => {
                visualBuilder.visualHost.colorPalette.isHighContrast = true;

                visualBuilder.visualHost.colorPalette.background = { value: backgroundColor };
                visualBuilder.visualHost.colorPalette.foreground = { value: foregroundColor };
            });

            it("should not use fill style", (done) => {
                visualBuilder.updateRenderTimeout(dataView, () => {
                    const layers = Array.from(visualBuilder.columns!);

                    expect(isColorAppliedToElements(layers, null, "fill"));

                    done();
                });
            });

            it("should use stroke style", (done) => {
                visualBuilder.updateRenderTimeout(dataView, () => {
                    const layers = Array.from(visualBuilder.columns!);

                    expect(isColorAppliedToElements(layers, foregroundColor, "stroke"));

                    done();
                });
            });

            function isColorAppliedToElements(
                elements: Element[],
                color?: string | null,
                colorStyleName: string = "fill"
            ): boolean {
                return elements.some((element: Element) => {
                    const currentColor: string = getComputedStyle(element)[colorStyleName];

                    if (!currentColor || !color) {
                        return currentColor === color;
                    }

                    return areColorsEqual(currentColor, color);
                });
            }
        });
    });
});