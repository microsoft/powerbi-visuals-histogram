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
import { manipulation } from "powerbi-visuals-utils-svgutils";

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

    public get mainElement(): JQuery {
        return this.element.children("svg.histogram");
    }

    public get labelsContainer(): JQuery {
        return this.mainElement
            .children("g")
            .children(".labelGraphicsContext");
    }

    public get labelTexts(): JQuery {
        return this.mainElement
            .children("g")
            .children("g.labelGraphicsContext")
            .children("g.labels")
            .children("text.data-labels");
    }

    public get columns() {
        return this.mainElement
            .children("g")
            .children("g.columns")
            .children("rect.column");
    }

    public get axes(): JQuery {
        return this.mainElement
            .children("g")
            .children(".axes");
    }

    public get xAxis(): JQuery {
        return this.axes.children("g.xAxis");
    }

    public get xAxisTicks(): JQuery {
        return this.xAxis.children("g.tick");
    }

    public get yAxis(): JQuery {
        return this.axes.children("g.yAxis");
    }

    public get yAxisTicks(): JQuery {
        return this.yAxis.children("g.tick");
    }

    public get legend(): JQuery {
        return this.mainElement
            .children("g")
            .children("g.legends")
            .children("text.legend");
    }

    public get xAxisLabel(): JQuery {
        return this.legend.filter((i: number, element: Element) => {
            return $(element).attr("transform").indexOf("rotate") < 0;
        });
    }

    public get yAxisLabel(): JQuery {
        return this.legend.filter((i: number, element: Element) => {
            return $(element).attr("transform").indexOf("rotate") >= 0;
        });
    }
}