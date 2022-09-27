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

import { VisualBuilderBase } from "powerbi-visuals-utils-testutils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

import { Visual as VisualClass } from "../src/visual";

export class HistogramChartBuilder extends VisualBuilderBase<VisualClass> {
    constructor(width: number, height: number) {
        super(width, height, "Histogram1445664487616");
    }

    public get instance(): VisualClass {
        return this.visual;
    }

    protected build(options: VisualConstructorOptions): VisualClass {
        return new VisualClass(options);
    }

    public get mainElement() {
        return this.element.querySelector("svg.histogram");
    }

    public get labelsContainer(): NodeListOf<Element> {
        return this.mainElement.querySelectorAll("g > .labelGraphicsContext");
    }

    public get labelTexts(): NodeListOf<Element> {
        return this.mainElement.querySelectorAll("g > g.labelGraphicsContext > g.labels > text.data-labels");
    }

    public get columns() {
        return this.mainElement?.querySelectorAll("g > g.columns > rect.column");
    }

    public get axes() {
        return this.mainElement?.querySelector("g > .axes");
    }

    public get xAxis() {
        return this.axes?.querySelector("g.xAxis");
    }

    public get xAxisTicks() {
        return this.xAxis?.querySelectorAll("g.tick");
    }

    public get yAxis() {
        return this.axes?.querySelector("g.yAxis");
    }

    public get yAxisTicks() {
        return this.yAxis?.querySelectorAll("g.tick");
    }

    public get legend() {
        return this.mainElement?.querySelectorAll("g > g.legends > text.legend");
    }

    public get xAxisLabel() {
        return (Array.from(this.legend!)).filter((element: Element, i: number) => {
            return element.getAttribute("transform")!.indexOf("rotate") < 0;
        });
    }

    public get yAxisLabel() {
        return (Array.from(this.legend!)).filter((element: Element, i: number) => {
            return element.getAttribute("transform")!.indexOf("rotate") >= 0;
        });
    }
}