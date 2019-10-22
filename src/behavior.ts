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

import powerbi from "powerbi-visuals-api";
import ISelectionId = powerbi.visuals.ISelectionId;

import { interactivityBaseService, interactivitySelectionService } from "powerbi-visuals-utils-interactivityutils";
import ISelectionHandler = interactivityBaseService.ISelectionHandler;
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import IInteractiveBehavior = interactivityBaseService.IInteractiveBehavior;
import IBehaviorOptions = interactivityBaseService.IBehaviorOptions;
import IInteractivityService = interactivityBaseService.IInteractivityService;

import { HistogramDataPoint } from "./dataInterfaces";
import { updateOpacity } from "./utils";

export interface HistogramBehaviorOptions extends IBehaviorOptions<SelectableDataPoint>{
    columns: Selection<HistogramDataPoint>;
    clearCatcher: Selection<any>;
    interactivityService: IInteractivityService<SelectableDataPoint>;
}

export class HistogramBehavior implements IInteractiveBehavior {
    private columns: Selection<HistogramDataPoint>;
    private clearCatcher: Selection<any>;
    private interactivityService: IInteractivityService<SelectableDataPoint>;

    public static CREATE(): IInteractiveBehavior {
        return new HistogramBehavior();
    }

    public bindEvents(
        behaviorOptions: HistogramBehaviorOptions,
        selectionHandler: ISelectionHandler
    ): void {

        this.columns = behaviorOptions.columns;
        this.interactivityService = behaviorOptions.interactivityService;
        this.clearCatcher = behaviorOptions.clearCatcher;

        this.columns.on("click", (dataPoint: HistogramDataPoint) => {
            const isCtrlPressed: boolean = d3.event && (<MouseEvent>d3.event).ctrlKey;

            selectionHandler.handleSelection(dataPoint.subDataPoints, isCtrlPressed);
        });

        this.clearCatcher.on("click", selectionHandler.handleClearSelection.bind(selectionHandler));
    }

    public renderSelection(hasSelection: boolean): void {
        updateOpacity(
            this.columns,
            this.interactivityService,
            hasSelection
        );
    }
}