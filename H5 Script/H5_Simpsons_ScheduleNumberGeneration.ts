class H5_Simpsons_ScheduleNumberGeneration {
  private scriptName: string = "H5_Simpsons_ScheduleNumberGeneration";
  private controller: IInstanceController;
  private log: IScriptLog;
  private contentElement: IContentElement;
  private miService;

  private unregisterRequested: Function;
  private unsubscribeReqCompleted: Function; // ✅ Add this line
  private grid: any;
  private selectionHandler: Function;
  currentdate: string;
  schedulenumber: string;
  lastschedulenumber_chiswickhouse: string;
  lastschedulenumber_Unitfour: string;
  private selectedRows : any
  private readonly button_id = "Assign Schedule Number";
  movexdata: string[];

  constructor(scriptArgs: IScriptArgs) {
    this.controller = scriptArgs.controller;
    this.contentElement = this.controller.GetContentElement();
    this.grid = this.controller.GetGrid();
    this.log = scriptArgs.log;
    this.miService = MIService;
  }

  public static Init(args: IScriptArgs): void {
    new H5_Simpsons_ScheduleNumberGeneration(args).run();
  }

  private async run(): Promise<void> {
    this.log.Info(`running script ${this.scriptName}`);

    const controller = this.controller;

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString();
    const day = now.getDate().toString();
    this.currentdate = year + (month.length === 1 ? "0" + month : month) + (day.length === 1 ? "0" + day : day); // pad single digit days

    this.addButton_assignschedulenumber();
     // UI Setup
    this.addLabel("Next Schedule number", 14, 65);
    this.addTextBox("NextSchedulenumber", "", 15, 65, 10, false);
    
    //Step 2.1 Fetch Schedule number
    this.movexdata = await this.callCRS881MI();
    console.log("Step2.1 - movexdata:", this.movexdata);
    //Step 2.02 Fetch Last Schedule number for Chiswick House
    this.lastschedulenumber_chiswickhouse = await this.callCUSEXTMI("CHI");
    console.log("Step2.2 - lastschedulenumber_chiswickhouse:", this.lastschedulenumber_chiswickhouse);

    //Step 2.03 Fetch Last Schedule number for Unit Four
    this.lastschedulenumber_Unitfour = await this.callCUSEXTMI("U4");
    console.log("Run - Step2.3 - lastschedulenumber_Unitfour:", this.lastschedulenumber_Unitfour);

    // Subscribe to the grid for selection changes. Handles enabling and disabling the button.
        const grid = this.controller.GetGrid(); 
        const handler = (e: any, args: any) => { 
            this.onSelectionChanged(e, args); 
        }; 
        grid.onSelectedRowsChanged.subscribe(handler);
        this.selectionHandler = handler;

        // Rebind event when rows are rendered after scroll or other rendering events
        this.grid.onRowsRendered.subscribe(() => {
            console.log("Rows have been re-rendered, reattaching selection handler.");
            this.grid.onSelectedRowsChanged.subscribe(this.selectionHandler);
        });

        this.unregisterRequested = controller.Requested.On((e) => {
			    this.onRequested(e);
		    });
    const list = this.controller.GetGrid();
    this.attachEvents(this.controller,list);

  }

  private async onSelectionChanged(e: any, args: any): Promise<void> {
     console.log(" Inside onSelectionChanged :", "onSelectionChanged");
     let selected: any;
    if (ScriptUtil.version >= 2.0) {
        selected = ListControl.ListView.SelectedItem();
        console.log('selected:', selected.length);
    } 
    if (selected.length < 1) { return; }
    console.log("selected:", selected);
    this.selectedRows = selected || [];

    let startdate;
    if (this.selectedRows.length > 0) {
        console.log("firstSelectedRowIndex:", JSON.stringify(this.grid.getSelectedGridRows()));
        startdate =  this.grid.getSelectedGridRows()?.[0]?.data?.ROSTDT;
        console.log("startdate:", startdate);
    }
    
    // Extract DMY parts from DDMMYY
      const dd = startdate.substring(0, 2);
      const mm = startdate.substring(2, 4);
      const yy = startdate.substring(4, 6);

      // Determine century
      const yearNum = parseInt(yy, 10);
      const century = yearNum < 50 ? "20" : "19";

      // Build formatted date as YYYYMMDD
      const formattedDate = century + yy + mm + dd;

      // Step 1 – Julian day
      const julianResp = await this.callCRS900MI(formattedDate);
      const julianDay = julianResp.YDNO;
      console.log('Run - julianDay: '+ julianDay);

      if (!julianDay) {
          ConfirmDialog.ShowMessageDialog({
          header: "Error",
          message: "Julian Day not found.",
          dialogType: "Error",
      });
        return;
      }

      // Step 03.01: Chiswick House schedule number
      const nextScheduleCHI = await this.calculateNextScheduleNumber_CHI(julianDay, this.lastschedulenumber_chiswickhouse);
      console.log("Chiswick House next schedule number:", nextScheduleCHI);
      // Step 03.02: Unit Four schedule number
      const nextScheduleU4 = await this.calculateNextScheduleNumber_U4(julianDay, this.lastschedulenumber_Unitfour);
      console.log("Unit Four next schedule number:", nextScheduleU4);
        

      // Production line check
      const productionLines = ListControl.ListView.GetValueByColumnName("WCLN");
      console.log("productionLines:", productionLines);
      const hasMatch = productionLines.some(line => this.movexdata.indexOf(line) !== -1);

      console.log("hasMatch:", hasMatch);

      // Assign schedule number based on production line match
      this.schedulenumber = hasMatch ? nextScheduleCHI : nextScheduleU4;
      console.log("Run - Assigned schedule number:", this.schedulenumber);

      // Set counts and values
      ScriptUtil.SetFieldValue('NextSchedulenumber', this.schedulenumber.toString(), this.controller);
      
  }

  private addButton_assignschedulenumber(): void {
    const buttonElement = new ButtonElement();
    buttonElement.Name = `${this.button_id}`;
    buttonElement.Value = "Assign Schedule Number";
    buttonElement.Position = new PositionElement();
    buttonElement.Position.Top = 15;
    buttonElement.Position.Left = 45;
    buttonElement.Position.Width = 8;
    buttonElement.IsEnabled = true;

    const _this = this;
    const $button = this.contentElement.AddElement(buttonElement);

    $button.click({}, async () => {
      const allMessages: { message: string; type: "error" | "success" }[] = [];
      console.log("this.selectedRows.length:", this.selectedRows.length);
       if (!this.selectedRows || this.selectedRows.length === 0) {
        ConfirmDialog.ShowMessageDialog({
          header: "Error",
          message: "Please select at least one row.",
          dialogType: "Error",
        });
        return;
      }
      try {
        
       // Production line check
        const productionLines = ListControl.ListView.GetValueByColumnName("WCLN");
        console.log("productionLines:", productionLines);
        const hasMatch = productionLines.some(line => this.movexdata.indexOf(line) !== -1);
        console.log("hasMatch:", hasMatch);
        let hasAnyError = false;

        for (let index = 0; index < this.selectedRows.length; index++) {
          let plannedproposalnumber = ListControl.ListView.GetValueByColumnName("PLPN")[index];
          const result = await this.updateSchedulenumber(
            plannedproposalnumber,
            this.schedulenumber
          );
          console.log("result:", JSON.stringify(result));
          if (result.success){
            allMessages.push({
              message: `✅ PLPN ${plannedproposalnumber} updated successfully`,
              type: "success",
            });
          } else {
            hasAnyError = true;
            allMessages.push({
              message: `❌ PLPN ${plannedproposalnumber} failed: ${result.message}`,
              type: "error",
            });
          }
        }
        console.log("hasAnyError:", hasAnyError);
         // 🛑 Step 2: Only update CUSEXTMI if all updates were OK
        if (!hasAnyError) {
          try {
            console.log("hasMatch inside !hasAnyError:", hasMatch);
            if (hasMatch) {
              await this.callCUSEXTMI_Chg("CHI", this.schedulenumber);
            } else {
              await this.callCUSEXTMI_Chg("U4", this.schedulenumber);
            }

            allMessages.push({
              message: `✅ Schedule Number ${this.schedulenumber} marked as used`,
              type: "success",
            });
          } catch (err) {
            allMessages.push({
              message: `❌ Failed to update schedule usage: ${err?.message || "Unknown error"}`,
              type: "error",
            });
          }
        } else {
          allMessages.push({
            message: "⚠️ Schedule usage not updated in CUGEX due to earlier errors",
            type: "error",
          });
        }

        allMessages.push({
          message: `<span style="color:green;">✅ Schedule Number Assigned: ${this.schedulenumber}</span>`,
          type: "success",
        });

      } catch (error) {
        console.error("Error in Assign Schedule number:", error);
        allMessages.push({
          message: `<span style="color:red;">❌ Assign Schedule number ${error.message || "Unknown error"}</span>`,
          type: "error",
        });
      }

      const hasErrors = allMessages.some(m => m.type === "error");
      ConfirmDialog.ShowMessageDialog({
        header: hasErrors ? "Assign Schedule Number Errors" : "Assign Schedule Number Success",
        message: allMessages.map(m => m.message).join("<br/>"),
        dialogType: hasErrors ? "Error" : "Info",
      });

      //Start - Below code added to auto refresh after the assignschedule number is clicked and all process are over
      setTimeout(() => {
          this.controller.PressKey("F5");
      }, 2000);
       //End - Below code added to auto refresh after the assignschedule number is clicked and all process are over

    });
  }

  private async calculateNextScheduleNumber_CHI( julianday: string, lastSchedule: string ): Promise<string> {

      const STEP = 10; // 0010
      const julianKey = julianday.slice(-5); // e.g. 26032

      const lastJulianKey = lastSchedule?.substring(0, 5) || "";
      // Case 1: MATCH → increment last schedule
      if (julianKey === lastJulianKey) {
        const incremented = parseInt(lastSchedule, 10) + STEP;
        return this.leftPad(incremented.toString(), lastSchedule.length);
      }
      // Case 2: NOT MATCH → reset
      return julianKey + "0010";
  }

  private async calculateNextScheduleNumber_U4( julianday: string, lastSchedule: string ): Promise<string> {

      const STEP = 10;      // increment step

      // Last 5 digits of Julian day (YYDDD)
      const julianKey = julianday.slice(-5); // e.g. 26032

      const lastJulianKey = lastSchedule?.substring(0, 5) || "";
      // Case 1: MATCH → increment last schedule
      if (julianKey === lastJulianKey) {
        const incremented = parseInt(lastSchedule, 10) + STEP;
        return this.leftPad(incremented.toString(), lastSchedule.length);
      }
      // Case 2: NOT MATCH → reset
      return julianKey + "1010";
      
  }

  private leftPad(value: string, totalLength: number): string {
    while (value.length < totalLength) {
      value = "0" + value;
    }
    return value;
  }

  private callCRS900MI(startdate: string) {
    const request = {
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

    return this.miService.executeRequestV2(request).then(res => ({
      YDNO: res?.items?.[0]?.YDNO || null,
    }));
  }

  private callCRS881MI(): Promise<string[]> {
    const request = {
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

    return this.miService.executeRequestV2(request).then(res =>
      res.items.map((i: any) => i.MVXD)
    );
  }

  private callCUSEXTMI(KPID: string): Promise<string> {
  const request = {
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

  return this.miService.executeRequestV2(request).then(res => {
    return res?.items?.[0]?.AL30 || "";
  });
  }

  private callCUSEXTMI_Chg(KPID: string, schedulenumber: string): Promise<string> {
  const request = {
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

  return this.miService.executeRequestV2(request).then(res => {
    return res?.items?.[0]?.AL30 || "";
  });
  }

  private addLabel(text: string, top: number, left: number): void {
    const label = new LabelElement();
    label.Name =  text;
    label.Value = text;
    label.Position = new PositionElement();
    label.Position.Top = top;
    label.Position.Left = left;
    this.contentElement.AddElement(label);
  }

  private addTextBox(name: string, value: string, top: number, left: number, width: number, readOnly: boolean): void {
    const textBox = new TextBoxElement();
    textBox.Name = name;
    textBox.Value = value;
    textBox.Position = new PositionElement();
    textBox.Position.Top = top;
    textBox.Position.Left = left;
    textBox.Position.Width = width;
    textBox.IsEnabled = !readOnly;
    this.contentElement.AddElement(textBox);
  }
  
  private updateSchedulenumber(plannedproposalnumber: string, schedulenumber : string) {
    const request = {
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

    return this.miService.executeRequestV2(request).then((res: any) => {

    const parsed = this.parseMIResponse(res);

    return {
      success: parsed.success,
      message: parsed.message,
      raw: res
    };
  });
  }

  private parseMIResponse(res: any) {

  let errorMessage = "";
  let hasError = false;

  // Transport level failure
  if (res?.wasTerminated) {
    return {
      success: false,
      message: "MI request was terminated"
    };
  }

  // Transaction level failure
  if ((res?.nrOfFailedTransactions ?? 0) > 0) {
    hasError = true;
  }

  // Business level failure (MOST IMPORTANT)
  if (res?.results?.length) {
    for (const r of res.results) {
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
  }

  private onRequested(args: RequestEventArgs): void {
    this.unregisterRequested();
    if (this.grid) this.grid.onSelectedRowsChanged.unsubscribe(this.selectionHandler);
  };

  private attachEvents(controller: IInstanceController, list: IActiveGrid,) {
    this.unsubscribeReqCompleted = controller.RequestCompleted.On((e) => {
      //Populate additional data on scroll
      console.log("attachEvents e.commandType: "+ e.commandType);
      console.log("attachEvents e.commandValue: "+ e.commandValue)
      if (e.commandType === "PAGE" && (e.commandValue === "DOWN")) {
          console.log("Inside for Scroll")
          this.onSelectionChanged(list,e);
      } else {
          this.detachEvents();
      }
    });
  }

  private detachEvents() {
    this.unsubscribeReqCompleted();
  }
  
}
