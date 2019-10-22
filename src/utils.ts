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
type Selection<T> = d3.Selection<any, T, any, any>;

import { interactivityBaseService } from "powerbi-visuals-utils-interactivityutils";
import IInteractivityService = interactivityBaseService.IInteractivityService;

import { HistogramDataPoint, HistogramSubDataPoint } from "./dataInterfaces";
import { SelectableDataPoint } from "powerbi-visuals-utils-interactivityutils/lib/interactivitySelectionService";

export interface StateOfDataPoint {
    selected: boolean;
    highlight: boolean;
}

export const DimmedOpacity: number = 0.4;
export const DefaultOpacity: number = 1.0;

export function getOpacity(
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
    let selected: boolean = false,
        highlight: boolean = false;

    if (dataPoint.subDataPoints && dataPoint.subDataPoints.length > 0) {
        dataPoint.subDataPoints.forEach((subDataPoint: HistogramSubDataPoint) => {
            selected = selected || subDataPoint.selected;
            highlight = highlight || subDataPoint.highlight;
        });
    }

    return {
        selected,
        highlight
    };
}

export function updateOpacity(
    columns: Selection<HistogramDataPoint>,
    interactivityService?: IInteractivityService<SelectableDataPoint>,
    hasSelection: boolean = false): void {

    let hasHighlights: boolean = false;

    if (interactivityService) {
        hasHighlights = interactivityService.hasSelection();
    }

    columns.style("opacity", (dataPoint: HistogramDataPoint) => {
        const selectedDataPoint: StateOfDataPoint = getStateOfDataPoint(dataPoint);

        return getOpacity(
            selectedDataPoint.selected,
            selectedDataPoint.highlight,
            !selectedDataPoint.highlight && hasSelection,
            !selectedDataPoint.selected && hasHighlights);
    });
}
