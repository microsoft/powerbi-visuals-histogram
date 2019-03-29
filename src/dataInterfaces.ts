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
import * as d3 from "d3";
import { ScaleLinear } from "d3-scale";

import HistogramBin = d3.Bin; // .HistogramBin; //ThresholdNumberArrayGenerator;

import { valueFormatter as vf } from "powerbi-visuals-utils-formattingutils";
import IValueFormatter = vf.IValueFormatter;

import { TooltipEnabledDataPoint } from "powerbi-visuals-utils-tooltiputils";

import { interactivityService } from "powerbi-visuals-utils-interactivityutils";
import SelectableDataPoint = interactivityService.SelectableDataPoint;

import { shapesInterfaces } from "powerbi-visuals-utils-svgutils";
import ISize = shapesInterfaces.ISize;

import { HistogramSettings } from "./settings";

export interface HistogramSubDataPoint extends SelectableDataPoint {
    highlight?: boolean;
}

export interface HistogramDataPoint extends
    HistogramBin<any, number>,
    TooltipEnabledDataPoint {
    y: number,
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

export interface HistogramData {
    dataPoints: HistogramDataPoint[];

    borderValues: HistogramBorderValues;

    settings: HistogramSettings;
    formatter: IValueFormatter;

    xLegendSize: number;
    yLegendSize: number;

    xCorrectedMax: number;
    xCorrectedMin: number;

    xScale?: ScaleLinear<any, any>;
    yScale?: ScaleLinear<any, any>;

    xLabelFormatter?: IValueFormatter;
    yLabelFormatter?: IValueFormatter;
}
