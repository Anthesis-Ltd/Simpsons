var PMS170E_ValidateProductionLineUpdated = /** @class */ (function () {

    // ------------------------------------------------------------------
    // Settings
    // ------------------------------------------------------------------

    // true  = after "Yes", the script presses ENTER itself.
    // false = after "Yes", the new value is typed into the field and the
    //         user presses Next/Enter themselves (useful for testing).
    var AUTO_PRESS_ENTER = true;

    // Time given to H5 to register the typed value before ENTER is sent.
    var SETTLE_MS = 300;

    // ------------------------------------------------------------------
    // Shared (static) state - survives across Init() calls.
    // ------------------------------------------------------------------
    PMS170E_ValidateProductionLineUpdated.activeInstance = null;
    PMS170E_ValidateProductionLineUpdated.dialogOpen = false;

    function PMS170E_ValidateProductionLineUpdated(args) {

        this.controller = args.controller;
        this.log = args.log;
        this.allowNext = false;
        this.validationInProgress = false;
        this.lastValidationTime = 0;
        this.unsubscribeRequesting = null;
        this.unsubscribeRequested = null;
        this.detached = false;
    }

    PMS170E_ValidateProductionLineUpdated.Init = function (args) {

        if (ScriptUtil.version >= 2.0) {

            var previous = PMS170E_ValidateProductionLineUpdated.activeInstance;

            if (previous) {

                previous.detachEvents();
            }

            var instance = new PMS170E_ValidateProductionLineUpdated(args);

            PMS170E_ValidateProductionLineUpdated.activeInstance = instance;

            instance.info(
                "Init. WEWCLN on panel load=" + instance.describeField("WEWCLN") +
                " WEAOID=" + args.controller.GetValue("WEAOID")
            );

            instance.run();
        }
    };

    PMS170E_ValidateProductionLineUpdated.prototype.info = function (text) {

        if (this.log) {

            this.log.Info(text);
        }
    };

    PMS170E_ValidateProductionLineUpdated.prototype.run = function () {

        this.unsubscribeRequesting = this.controller.Requesting.On(

            function (e) {

                this.onRequesting(e);

            }.bind(this)
        );

        this.unsubscribeRequested = this.controller.Requested.On(

            function (e) {

                this.info(
                    "Requested fired - detaching. commandType=" +
                    e.commandType + " commandValue=" + e.commandValue
                );

                this.detachEvents();

            }.bind(this)
        );
    };

    PMS170E_ValidateProductionLineUpdated.prototype.detachEvents = function () {

        if (this.detached) {

            return;
        }

        this.detached = true;

        if (typeof this.unsubscribeRequesting === "function") {

            this.unsubscribeRequesting();
        }

        if (typeof this.unsubscribeRequested === "function") {

            this.unsubscribeRequested();
        }

        this.unsubscribeRequesting = null;
        this.unsubscribeRequested = null;

        if (PMS170E_ValidateProductionLineUpdated.activeInstance === this) {

            PMS170E_ValidateProductionLineUpdated.activeInstance = null;
        }
    };

    PMS170E_ValidateProductionLineUpdated.prototype.cancel = function (e) {

        e.cancel = true;
        e.Cancel = true;
    };

    PMS170E_ValidateProductionLineUpdated.prototype.onRequesting = function (e) {

        if (
            this.detached ||
            PMS170E_ValidateProductionLineUpdated.activeInstance !== this
        ) {

            return;
        }

        this.info(
            "Requesting fired. commandType=" + e.commandType +
            " commandValue=" + e.commandValue +
            " allowNext=" + this.allowNext +
            " dialogOpen=" + PMS170E_ValidateProductionLineUpdated.dialogOpen +
            " WEWCLN=" + this.describeField("WEWCLN")
        );

        if (this.allowNext) {

            this.allowNext = false;
            return;
        }

        if (PMS170E_ValidateProductionLineUpdated.dialogOpen) {

            this.cancel(e);
            return;
        }

        // Next button and Enter both arrive as commandValue "ENTER".
        if (e.commandValue !== "ENTER") {

            return;
        }

        var now = new Date().getTime();

        if (now - this.lastValidationTime < 1000) {

            this.cancel(e);
            return;
        }

        this.lastValidationTime = now;
        this.cancel(e);

        if (this.validationInProgress) {

            return;
        }

        this.validationInProgress = true;

        this.validateProductionLine()

            .then(function (result) {

                this.validationInProgress = false;

                this.info("Validation resolved: " + result);

                if (this.detached) {

                    return;
                }

                // "valid"   -> already correct, send ENTER
                // "updated" -> value typed in, send ENTER (if enabled)
                // anything else -> stay on the panel
                if (result === "valid" ||
                    (result === "updated" && AUTO_PRESS_ENTER)) {

                    this.allowNext = true;
                    this.controller.PressKey("ENTER");
                }

            }.bind(this))

            .catch(function (error) {

                this.validationInProgress = false;

                this.showMessage(
                    "Error",
                    "Unable to validate Production Line.\n\n" + error
                );

            }.bind(this));
    };

    // Resolves with "valid", "updated", "failed" or "stopped".
    PMS170E_ValidateProductionLineUpdated.prototype.validateProductionLine =
        function () {

            return new Promise(function (resolve, reject) {

                var aoid = this.controller.GetValue("WEAOID");
                var wcln = this.controller.GetValue("WEWCLN");

                aoid = aoid ? String(aoid).trim() : "";
                wcln = wcln ? String(wcln).trim() : "";

                if (aoid === "") {

                    /* this.showMessage(
                        "Missing Order/Reference",
                        "AOID is required before continuing."
                    );
 */
                    resolve("valid");
                    return;
                }

                if (wcln === "") {

                    this.showMessage(
                        "Missing Production Line",
                        "Production Line (WCLN) is required before continuing."
                    );

                    resolve("stopped");
                    return;
                }

                var request = {

                    program: "PDS035MI",
                    transaction: "GetAltRouting",
                    record: {
                        FACI: "SB1",
                        AOID: aoid
                    },
                    outputFields: ["TX15"],
                    company: ScriptUtil.GetUserContext("CurrentCompany"),
                    division: ScriptUtil.GetUserContext("CurrentDivision")
                };

                MIService.executeRequestV2(request)

                    .then(function (response) {

                        var item = response.item;
                        var tx15 = "";

                        if (item && item.TX15 !== undefined) {

                            tx15 = String(item.TX15).trim();
                        }

                        if (tx15.toUpperCase() === wcln.toUpperCase()) {

                            resolve("valid");
                            return;
                        }

                        this.showConfirmMessage(

                            "Incorrect Production Line",

                            "<br/>" +
                            "Current Production Line: " + wcln +
                            "<br/><br/>" +
                            "Required Production Line: " + tx15 +
                            "<br/><br/>" +
                            "Would you like to update the Production Line?",

                            function onYes() {

                                this.typeIntoField("WEWCLN", tx15, function (ok) {

                                    if (!ok) {

                                        this.showMessage(
                                            "Update Failed",
                                            "Production Line did not update to " +
                                            tx15 + ". Please set it manually " +
                                            "and try again."
                                        );

                                        resolve("failed");
                                        return;
                                    }

                                    resolve("updated");

                                }.bind(this));

                            }.bind(this),

                            function onNo() {

                                resolve("stopped");

                            }.bind(this)
                        );

                    }.bind(this))

                    .catch(function (error) {

                        reject(error);
                    });

            }.bind(this));
        };

    // ------------------------------------------------------------------
    // Field handling
    // ------------------------------------------------------------------

    // Returns the real <input>/<select>/<textarea> for a field name.
    PMS170E_ValidateProductionLineUpdated.prototype.getInput = function (field) {

        var el = null;

        try {

            el = this.controller.GetElement
                ? this.controller.GetElement(field)
                : null;
        }
        catch (err) {

            el = null;
        }

        if (el && el.jquery) {

            el = el[0];
        }

        if (
            el &&
            el.querySelector &&
            !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)
        ) {

            el = el.querySelector("input, select, textarea") || el;
        }

        if (!el) {

            // Fallback: look the field up in the page directly.
            el = document.getElementById(field) ||
                document.querySelector(
                    "[name='" + field + "'], [id$='" + field + "']"
                );
        }

        return el || null;
    };

    // "model=<GetValue> dom=<what is really in the input> tag=<type>"
    PMS170E_ValidateProductionLineUpdated.prototype.describeField = function (field) {

        var el = this.getInput(field);

        return "model=" + this.controller.GetValue(field) +
            " dom=" + (el ? el.value : "(no element)") +
            " tag=" + (el ? el.tagName : "-");
    };

    PMS170E_ValidateProductionLineUpdated.prototype.fire = function (el, name) {

        var evt;

        if (name === "keydown" || name === "keyup") {

            try {

                evt = new KeyboardEvent(name, { bubbles: true, cancelable: true });
            }
            catch (err) {

                evt = document.createEvent("HTMLEvents");
                evt.initEvent(name, true, true);
            }
        }
        else {

            evt = document.createEvent("HTMLEvents");
            evt.initEvent(name, true, true);
        }

        el.dispatchEvent(evt);
    };

    // Puts a value into a field the same way a user typing would:
    // focus -> write value into the real input -> input/change/key events
    // -> blur. SetValue() alone only changes what is displayed; H5 does
    // not treat the field as edited, so the old value is sent to M3.
    PMS170E_ValidateProductionLineUpdated.prototype.typeIntoField =
        function (field, value, callback) {

            this.info("typeIntoField BEFORE: " + this.describeField(field));

            // Keep H5's own model in step.
            this.controller.SetValue(field, value);

            var el = this.getInput(field);

            if (el && el.dispatchEvent) {

                try {

                    if (el.focus) {

                        el.focus();
                    }

                    if (el.tagName === "SELECT") {

                        for (var o = 0; o < el.options.length; o++) {

                            if (
                                String(el.options[o].value).trim().toUpperCase() ===
                                String(value).trim().toUpperCase()
                            ) {

                                el.selectedIndex = o;
                                break;
                            }
                        }
                    }
                    else {

                        var proto = el.tagName === "TEXTAREA"
                            ? HTMLTextAreaElement.prototype
                            : HTMLInputElement.prototype;

                        var desc = Object.getOwnPropertyDescriptor(proto, "value");

                        if (desc && desc.set) {

                            desc.set.call(el, value);
                        }
                        else {

                            el.value = value;
                        }
                    }

                    // The DOM now holds the NEW value, so blur/focusout
                    // commit the new value rather than the old one.
                    this.fire(el, "keydown");
                    this.fire(el, "input");
                    this.fire(el, "keyup");
                    this.fire(el, "change");
                    this.fire(el, "blur");
                    this.fire(el, "focusout");
                }
                catch (err) {

                    this.info("typeIntoField event error: " + err);
                }
            }
            else {

                this.info("typeIntoField: no input element found for " + field);
            }

            // Give H5 a moment to register the edit, then check.
            setTimeout(function () {

                var expected = String(value).trim().toUpperCase();

                var model = this.controller.GetValue(field);
                model = model ? String(model).trim().toUpperCase() : "";

                var dom = el ? String(el.value || "").trim().toUpperCase() : model;

                this.info("typeIntoField AFTER: " + this.describeField(field));

                callback(model === expected && dom === expected);

            }.bind(this), SETTLE_MS);
        };

    // ------------------------------------------------------------------
    // Dialogs (only one open at a time across all instances)
    // ------------------------------------------------------------------

    PMS170E_ValidateProductionLineUpdated.prototype.openDialog =
        function (options, onClosed) {

            if (PMS170E_ValidateProductionLineUpdated.dialogOpen) {

                this.info("Dialog suppressed (one already open): " + options.header);
                return false;
            }

            PMS170E_ValidateProductionLineUpdated.dialogOpen = true;

            var settled = false;
            var self = this;

            options.id = "PMS170E_ProductionLineValidation";

            options.closed = function (ret) {

                self.info(
                    "Dialog closed. header=" + options.header +
                    " ret=" + JSON.stringify(ret)
                );

                if (settled) {

                    return;
                }

                settled = true;

                PMS170E_ValidateProductionLineUpdated.dialogOpen = false;

                if (onClosed) {

                    onClosed(ret);
                }
            };

            ConfirmDialog.ShowMessageDialog(options);

            return true;
        };

    PMS170E_ValidateProductionLineUpdated.prototype.showMessage =
        function (header, message) {

            this.openDialog({
                header: header,
                message: message,
                dialogType: "Information"
            });
        };

    PMS170E_ValidateProductionLineUpdated.prototype.showConfirmMessage =
        function (header, message, onYes, onNo) {

            var shown = this.openDialog(

                {
                    header: header,
                    message: message,
                    dialogType: "Question",
                    withCancelButton: true,
                    isCancelDefault: false
                },

                function (ret) {

                    if (ret && ret.ok && !ret.cancel) {

                        if (onYes) {

                            onYes();
                        }
                    }
                    else if (onNo) {

                        onNo();
                    }
                }
            );

            if (!shown && onNo) {

                onNo();
            }
        };

    return PMS170E_ValidateProductionLineUpdated;

}());
