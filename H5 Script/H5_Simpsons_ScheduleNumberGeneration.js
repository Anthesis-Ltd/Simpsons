var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var H5_Simpsons_ScheduleNumberGeneration = /** @class */ (function () {
    function H5_Simpsons_ScheduleNumberGeneration(scriptArgs) {
        this.scriptName = "H5_Simpsons_ScheduleNumberGeneration";
        this.button_id = "Assign Schedule Number";
        this.controller = scriptArgs.controller;
        this.contentElement = this.controller.GetContentElement();
        this.grid = this.controller.GetGrid();
        this.log = scriptArgs.log;
        this.miService = MIService;
    }
    H5_Simpsons_ScheduleNumberGeneration.Init = function (args) {
        new H5_Simpsons_ScheduleNumberGeneration(args).run();
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var controller, now, year, month, day, _a, _b, _c, grid, handler, list;
            var _this_1 = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        this.log.Info("running script ".concat(this.scriptName));
                        controller = this.controller;
                        now = new Date();
                        year = now.getFullYear().toString();
                        month = (now.getMonth() + 1).toString();
                        day = now.getDate().toString();
                        this.currentdate = year + (month.length === 1 ? "0" + month : month) + (day.length === 1 ? "0" + day : day); // pad single digit days
                        this.addButton_assignschedulenumber();
                        // UI Setup
                        this.addLabel("Next Schedule number", 14, 65);
                        this.addTextBox("NextSchedulenumber", "", 15, 65, 10, false);
                        //Step 2.1 Fetch Schedule number
                        _a = this;
                        return [4 /*yield*/, this.callCRS881MI()];
                    case 1:
                        //Step 2.1 Fetch Schedule number
                        _a.movexdata = _d.sent();
                        console.log("Step2.1 - movexdata:", this.movexdata);
                        //Step 2.02 Fetch Last Schedule number for Chiswick House
                        _b = this;
                        return [4 /*yield*/, this.callCUSEXTMI("CHI")];
                    case 2:
                        //Step 2.02 Fetch Last Schedule number for Chiswick House
                        _b.lastschedulenumber_chiswickhouse = _d.sent();
                        console.log("Step2.2 - lastschedulenumber_chiswickhouse:", this.lastschedulenumber_chiswickhouse);
                        //Step 2.03 Fetch Last Schedule number for Unit Four
                        _c = this;
                        return [4 /*yield*/, this.callCUSEXTMI("U4")];
                    case 3:
                        //Step 2.03 Fetch Last Schedule number for Unit Four
                        _c.lastschedulenumber_Unitfour = _d.sent();
                        console.log("Run - Step2.3 - lastschedulenumber_Unitfour:", this.lastschedulenumber_Unitfour);
                        grid = this.controller.GetGrid();
                        handler = function (e, args) {
                            _this_1.onSelectionChanged(e, args);
                        };
                        grid.onSelectedRowsChanged.subscribe(handler);
                        this.selectionHandler = handler;
                        // Rebind event when rows are rendered after scroll or other rendering events
                        this.grid.onRowsRendered.subscribe(function () {
                            console.log("Rows have been re-rendered, reattaching selection handler.");
                            _this_1.grid.onSelectedRowsChanged.subscribe(_this_1.selectionHandler);
                        });
                        this.unregisterRequested = controller.Requested.On(function (e) {
                            _this_1.onRequested(e);
                        });
                        list = this.controller.GetGrid();
                        this.attachEvents(this.controller, list);
                        return [2 /*return*/];
                }
            });
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.onSelectionChanged = function (e, args) {
        return __awaiter(this, void 0, void 0, function () {
            var selected, startdate, dd, mm, yy, yearNum, century, formattedDate, julianResp, julianDay, nextScheduleCHI, nextScheduleU4, productionLines, hasMatch;
            var _this_1 = this;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log(" Inside onSelectionChanged :", "onSelectionChanged");
                        if (ScriptUtil.version >= 2.0) {
                            selected = ListControl.ListView.SelectedItem();
                            console.log('selected:', selected.length);
                        }
                        if (selected.length < 1) {
                            return [2 /*return*/];
                        }
                        console.log("selected:", selected);
                        this.selectedRows = selected || [];
                        if (this.selectedRows.length > 0) {
                            console.log("firstSelectedRowIndex:", JSON.stringify(this.grid.getSelectedGridRows()));
                            startdate = (_c = (_b = (_a = this.grid.getSelectedGridRows()) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.ROSTDT;
                            console.log("startdate:", startdate);
                        }
                        dd = startdate.substring(0, 2);
                        mm = startdate.substring(2, 4);
                        yy = startdate.substring(4, 6);
                        yearNum = parseInt(yy, 10);
                        century = yearNum < 50 ? "20" : "19";
                        formattedDate = century + yy + mm + dd;
                        return [4 /*yield*/, this.callCRS900MI(formattedDate)];
                    case 1:
                        julianResp = _d.sent();
                        julianDay = julianResp.YDNO;
                        console.log('Run - julianDay: ' + julianDay);
                        if (!julianDay) {
                            ConfirmDialog.ShowMessageDialog({
                                header: "Error",
                                message: "Julian Day not found.",
                                dialogType: "Error",
                            });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.calculateNextScheduleNumber_CHI(julianDay, this.lastschedulenumber_chiswickhouse)];
                    case 2:
                        nextScheduleCHI = _d.sent();
                        console.log("Chiswick House next schedule number:", nextScheduleCHI);
                        return [4 /*yield*/, this.calculateNextScheduleNumber_U4(julianDay, this.lastschedulenumber_Unitfour)];
                    case 3:
                        nextScheduleU4 = _d.sent();
                        console.log("Unit Four next schedule number:", nextScheduleU4);
                        productionLines = ListControl.ListView.GetValueByColumnName("WCLN");
                        console.log("productionLines:", productionLines);
                        hasMatch = productionLines.some(function (line) { return _this_1.movexdata.indexOf(line) !== -1; });
                        console.log("hasMatch:", hasMatch);
                        // Assign schedule number based on production line match
                        this.schedulenumber = hasMatch ? nextScheduleCHI : nextScheduleU4;
                        console.log("Run - Assigned schedule number:", this.schedulenumber);
                        // Set counts and values
                        ScriptUtil.SetFieldValue('NextSchedulenumber', this.schedulenumber.toString(), this.controller);
                        return [2 /*return*/];
                }
            });
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.addButton_assignschedulenumber = function () {
        var _this_1 = this;
        var buttonElement = new ButtonElement();
        buttonElement.Name = "".concat(this.button_id);
        buttonElement.Value = "Assign Schedule Number";
        buttonElement.Position = new PositionElement();
        buttonElement.Position.Top = 15;
        buttonElement.Position.Left = 45;
        buttonElement.Position.Width = 8;
        buttonElement.IsEnabled = true;
        var _this = this;
        var $button = this.contentElement.AddElement(buttonElement);
        $button.click({}, function () { return __awaiter(_this_1, void 0, void 0, function () {
            var allMessages, productionLines, hasMatch, hasAnyError, index, plannedproposalnumber, result, err_1, error_1, hasErrors;
            var _this_1 = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        allMessages = [];
                        console.log("this.selectedRows.length:", this.selectedRows.length);
                        if (!this.selectedRows || this.selectedRows.length === 0) {
                            ConfirmDialog.ShowMessageDialog({
                                header: "Error",
                                message: "Please select at least one row.",
                                dialogType: "Error",
                            });
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 15, , 16]);
                        productionLines = ListControl.ListView.GetValueByColumnName("WCLN");
                        console.log("productionLines:", productionLines);
                        hasMatch = productionLines.some(function (line) { return _this_1.movexdata.indexOf(line) !== -1; });
                        console.log("hasMatch:", hasMatch);
                        hasAnyError = false;
                        index = 0;
                        _a.label = 2;
                    case 2:
                        if (!(index < this.selectedRows.length)) return [3 /*break*/, 5];
                        plannedproposalnumber = ListControl.ListView.GetValueByColumnName("PLPN")[index];
                        return [4 /*yield*/, this.updateSchedulenumber(plannedproposalnumber, this.schedulenumber)];
                    case 3:
                        result = _a.sent();
                        console.log("result:", JSON.stringify(result));
                        if (result.success) {
                            allMessages.push({
                                message: "\u2705 PLPN ".concat(plannedproposalnumber, " updated successfully"),
                                type: "success",
                            });
                        }
                        else {
                            hasAnyError = true;
                            allMessages.push({
                                message: "\u274C PLPN ".concat(plannedproposalnumber, " failed: ").concat(result.message),
                                type: "error",
                            });
                        }
                        _a.label = 4;
                    case 4:
                        index++;
                        return [3 /*break*/, 2];
                    case 5:
                        console.log("hasAnyError:", hasAnyError);
                        if (!!hasAnyError) return [3 /*break*/, 13];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 11, , 12]);
                        console.log("hasMatch inside !hasAnyError:", hasMatch);
                        if (!hasMatch) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.callCUSEXTMI_Chg("CHI", this.schedulenumber)];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 8: return [4 /*yield*/, this.callCUSEXTMI_Chg("U4", this.schedulenumber)];
                    case 9:
                        _a.sent();
                        _a.label = 10;
                    case 10:
                        allMessages.push({
                            message: "\u2705 Schedule Number ".concat(this.schedulenumber, " marked as used"),
                            type: "success",
                        });
                        return [3 /*break*/, 12];
                    case 11:
                        err_1 = _a.sent();
                        allMessages.push({
                            message: "\u274C Failed to update schedule usage: ".concat((err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || "Unknown error"),
                            type: "error",
                        });
                        return [3 /*break*/, 12];
                    case 12: return [3 /*break*/, 14];
                    case 13:
                        allMessages.push({
                            message: "⚠️ Schedule usage not updated in CUGEX due to earlier errors",
                            type: "error",
                        });
                        _a.label = 14;
                    case 14:
                        allMessages.push({
                            message: "<span style=\"color:green;\">\u2705 Schedule Number Assigned: ".concat(this.schedulenumber, "</span>"),
                            type: "success",
                        });
                        return [3 /*break*/, 16];
                    case 15:
                        error_1 = _a.sent();
                        console.error("Error in Assign Schedule number:", error_1);
                        allMessages.push({
                            message: "<span style=\"color:red;\">\u274C Assign Schedule number ".concat(error_1.message || "Unknown error", "</span>"),
                            type: "error",
                        });
                        return [3 /*break*/, 16];
                    case 16:
                        hasErrors = allMessages.some(function (m) { return m.type === "error"; });
                        ConfirmDialog.ShowMessageDialog({
                            header: hasErrors ? "Assign Schedule Number Errors" : "Assign Schedule Number Success",
                            message: allMessages.map(function (m) { return m.message; }).join("<br/>"),
                            dialogType: hasErrors ? "Error" : "Info",
                        });
                        //Start - Below code added to auto refresh after the assignschedule number is clicked and all process are over
                        setTimeout(function () {
                            _this_1.controller.PressKey("F5");
                        }, 2000);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.calculateNextScheduleNumber_CHI = function (julianday, lastSchedule) {
        return __awaiter(this, void 0, void 0, function () {
            var STEP, julianKey, lastJulianKey, incremented;
            return __generator(this, function (_a) {
                STEP = 10;
                julianKey = julianday.slice(-5);
                lastJulianKey = (lastSchedule === null || lastSchedule === void 0 ? void 0 : lastSchedule.substring(0, 5)) || "";
                // Case 1: MATCH → increment last schedule
                if (julianKey === lastJulianKey) {
                    incremented = parseInt(lastSchedule, 10) + STEP;
                    return [2 /*return*/, this.leftPad(incremented.toString(), lastSchedule.length)];
                }
                // Case 2: NOT MATCH → reset
                return [2 /*return*/, julianKey + "0010"];
            });
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.calculateNextScheduleNumber_U4 = function (julianday, lastSchedule) {
        return __awaiter(this, void 0, void 0, function () {
            var STEP, julianKey, lastJulianKey, incremented;
            return __generator(this, function (_a) {
                STEP = 10;
                julianKey = julianday.slice(-5);
                lastJulianKey = (lastSchedule === null || lastSchedule === void 0 ? void 0 : lastSchedule.substring(0, 5)) || "";
                // Case 1: MATCH → increment last schedule
                if (julianKey === lastJulianKey) {
                    incremented = parseInt(lastSchedule, 10) + STEP;
                    return [2 /*return*/, this.leftPad(incremented.toString(), lastSchedule.length)];
                }
                // Case 2: NOT MATCH → reset
                return [2 /*return*/, julianKey + "1010"];
            });
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.leftPad = function (value, totalLength) {
        while (value.length < totalLength) {
            value = "0" + value;
        }
        return value;
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.callCRS900MI = function (startdate) {
        var request = {
            program: "CRS900MI",
            transaction: "GetSysCalDate",
            outputFields: ["YDNO"],
            record: {
                YMD8: startdate,
            },
            enableCsrf: true,
            company: ScriptUtil.GetUserContext("CurrentCompany"),
            division: ScriptUtil.GetUserContext("CurrentDivision"),
        };
        return this.miService.executeRequestV2(request).then(function (res) {
            var _a, _b;
            return ({
                YDNO: ((_b = (_a = res === null || res === void 0 ? void 0 : res.items) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.YDNO) || null,
            });
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.callCRS881MI = function () {
        var request = {
            program: "CRS881MI",
            transaction: "LstTranslation",
            outputFields: ["MVXD"],
            record: {
                TRQF: "1",
                MSTD: "CHI",
                MVRS: "1",
                BMSG: "Chiswick Production",
                IBOB: "I",
                ELMP: "CHI",
                ELMD: "CHI",
            },
            enableCsrf: true,
            company: ScriptUtil.GetUserContext("CurrentCompany"),
            division: ScriptUtil.GetUserContext("CurrentDivision"),
        };
        return this.miService.executeRequestV2(request).then(function (res) {
            return res.items.map(function (i) { return i.MVXD; });
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.callCUSEXTMI = function (KPID) {
        var request = {
            program: "CUSEXTMI",
            transaction: "GetAlphaKPI",
            outputFields: ["AL30"],
            record: {
                KPID: KPID,
                PK01: KPID,
            },
            enableCsrf: true,
            company: ScriptUtil.GetUserContext("CurrentCompany"),
            division: ScriptUtil.GetUserContext("CurrentDivision"),
        };
        return this.miService.executeRequestV2(request).then(function (res) {
            var _a, _b;
            return ((_b = (_a = res === null || res === void 0 ? void 0 : res.items) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.AL30) || "";
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.callCUSEXTMI_Chg = function (KPID, schedulenumber) {
        var request = {
            program: "CUSEXTMI",
            transaction: "ChgAlphaKPI",
            record: {
                KPID: KPID,
                PK01: KPID,
                AL30: schedulenumber
            },
            enableCsrf: true,
            company: ScriptUtil.GetUserContext("CurrentCompany"),
            division: ScriptUtil.GetUserContext("CurrentDivision"),
        };
        return this.miService.executeRequestV2(request).then(function (res) {
            var _a, _b;
            return ((_b = (_a = res === null || res === void 0 ? void 0 : res.items) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.AL30) || "";
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.addLabel = function (text, top, left) {
        var label = new LabelElement();
        label.Name = text;
        label.Value = text;
        label.Position = new PositionElement();
        label.Position.Top = top;
        label.Position.Left = left;
        this.contentElement.AddElement(label);
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.addTextBox = function (name, value, top, left, width, readOnly) {
        var textBox = new TextBoxElement();
        textBox.Name = name;
        textBox.Value = value;
        textBox.Position = new PositionElement();
        textBox.Position.Top = top;
        textBox.Position.Left = left;
        textBox.Position.Width = width;
        textBox.IsEnabled = !readOnly;
        this.contentElement.AddElement(textBox);
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.updateSchedulenumber = function (plannedproposalnumber, schedulenumber) {
        var _this_1 = this;
        var request = {
            program: "PMS170MI",
            transaction: "Updat",
            record: {
                PLPN: plannedproposalnumber,
                SCHN: schedulenumber
            },
            enableCsrf: true,
            company: ScriptUtil.GetUserContext("CurrentCompany"),
            division: ScriptUtil.GetUserContext("CurrentDivision"),
        };
        return this.miService.executeRequestV2(request).then(function (res) {
            var parsed = _this_1.parseMIResponse(res);
            return {
                success: parsed.success,
                message: parsed.message,
                raw: res
            };
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.parseMIResponse = function (res) {
        var _a, _b;
        var errorMessage = "";
        var hasError = false;
        // Transport level failure
        if (res === null || res === void 0 ? void 0 : res.wasTerminated) {
            return {
                success: false,
                message: "MI request was terminated"
            };
        }
        // Transaction level failure
        if (((_a = res === null || res === void 0 ? void 0 : res.nrOfFailedTransactions) !== null && _a !== void 0 ? _a : 0) > 0) {
            hasError = true;
        }
        // Business level failure (MOST IMPORTANT)
        if ((_b = res === null || res === void 0 ? void 0 : res.results) === null || _b === void 0 ? void 0 : _b.length) {
            for (var _i = 0, _c = res.results; _i < _c.length; _i++) {
                var r = _c[_i];
                if (r.errorMessage) {
                    hasError = true;
                    errorMessage = r.errorMessage;
                    break;
                }
            }
        }
        return {
            success: !hasError,
            message: errorMessage || "OK"
        };
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.onRequested = function (args) {
        this.unregisterRequested();
        if (this.grid)
            this.grid.onSelectedRowsChanged.unsubscribe(this.selectionHandler);
    };
    ;
    H5_Simpsons_ScheduleNumberGeneration.prototype.attachEvents = function (controller, list) {
        var _this_1 = this;
        this.unsubscribeReqCompleted = controller.RequestCompleted.On(function (e) {
            //Populate additional data on scroll
            console.log("attachEvents e.commandType: " + e.commandType);
            console.log("attachEvents e.commandValue: " + e.commandValue);
            if (e.commandType === "PAGE" && (e.commandValue === "DOWN")) {
                console.log("Inside for Scroll");
                _this_1.onSelectionChanged(list, e);
            }
            else {
                _this_1.detachEvents();
            }
        });
    };
    H5_Simpsons_ScheduleNumberGeneration.prototype.detachEvents = function () {
        this.unsubscribeReqCompleted();
    };
    return H5_Simpsons_ScheduleNumberGeneration;
}());
