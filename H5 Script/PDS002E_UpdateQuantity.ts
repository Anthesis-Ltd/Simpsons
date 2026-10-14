/*
 * Name: PDS002E_UpdateQuantity
 * Update Quantity
 * History:
 * 20260824    Jags
 * Functional consultant: e.fernando@anthesis.co.uk
 */
class PDS002E_UpdateQuantity {
    private scriptName: string = "PDS002E_UpdateQuantity";
    private controller: IInstanceController;
    private log: IScriptLog;
    private args: string;
    private contentElement: IContentElement = null;
    private miService;
    private modeType: ReturnType<IInstanceController['GetMode']>;
    private readonly MODE_TYPES = { CREATE: "1", UPDATE: "2", COPY: "3", DISPLAY: "5" };
    private readonly FACILITY = "SB1";
    private ALLOW_UPDATE: boolean;

    constructor(scriptArgs: IScriptArgs) {
        this.controller = scriptArgs.controller;
        this.contentElement = this.controller.GetContentElement();
        this.log = scriptArgs.log;
        this.args = scriptArgs.args;
        this.miService = MIService;
        this.modeType = this.controller.GetMode();
        this.ALLOW_UPDATE = this.modeType != this.MODE_TYPES.DISPLAY;
    }

    public static Init(args: IScriptArgs): void {
        new PDS002E_UpdateQuantity(args).run();
    }

    private async run(): Promise<void> {
        this.log.Info(`running script ${this.scriptName}`);

        if (!this.ALLOW_UPDATE) {
            return;
        }

        const itemtype = this.getM3FieldValue('MMITTY');
        if (itemtype !== "Z30") {
            return;
        }

        const product = this.getM3FieldValue('PMPRNO');
        const componentnumber = this.getM3FieldValue('PMMTNO');

        const productInfo = await this.MMS200MI_Get({ productnumber: product });
        if (!productInfo) {
            return;
        }

        const { itty, unms } = productInfo;
        this.log.Info(`Product ${product}: ITTY=${itty}, UNMS=${unms}`);

        if (itty !== "Z11") {
            return;
        }

        let quantity: string;

        if (unms === "KG") {
            quantity = await this.MMS015MI_Convert({ componentnumber });
            if (quantity == null || quantity === '') {
                this.log.Error(`Conversion KG -> L failed for item ${componentnumber}`);
                return;
            }
            ScriptUtil.SetFieldValue("W1CNQT", quantity);

        } else if (unms === "L") {
            quantity = '1';

        } else {
            this.log.Info(`UNMS ${unms} not handled, no update performed`);
            return;
        }

        // Key fields of the component line
        const PDS002 = {
            FACI: this.FACILITY,
            PRNO: product,
            STRT: this.getM3FieldValue('PMSTRT'),
            MSEQ: this.getM3FieldValue('PMMSEQ'),
            CNQT: quantity
        };
        await this.PDS002MI_UpdateComponent({ PDS002 });
    }

    private async MMS200MI_Get({ productnumber }): Promise<{ itty: string; unms: string } | null> {
        const program = "MMS200MI";
        const transaction = "Get";
        try {
            const myRequest = new MIRequest();
            myRequest.program = program;
            myRequest.transaction = transaction;
            myRequest.outputFields = ["ITTY", "UNMS"];
            // Input to the transaction
            myRequest.record = {
                ITNO: productnumber
            };

            const response: IMIResponse = await this.miService.executeRequestV2(myRequest);

            const errorMessage = response.errorMessage;
            if (errorMessage) {
                // Non classic UI has a different way of handling error messages as opposed to V2.
                throw { ...response };
            }

            const item = response.items?.[0];
            if (!item) {
                return null;
            }

            return {
                itty: (item.ITTY || '').trim(),
                unms: (item.UNMS || '').trim()
            };
        } catch (error) {
            this.log.Error(`${program}/${transaction} failed: ${JSON.stringify(error)}`);
            return null;
        }
    }

    private async MMS015MI_Convert({ componentnumber }): Promise<string | null> {
        const program = "MMS015MI";
        const transaction = "Convert";
        try {
            const myRequest = new MIRequest();
            myRequest.program = program;
            myRequest.transaction = transaction;
            myRequest.outputFields = ["ORQT"];
            // Input to the transaction
            myRequest.record = {
                ITNO: componentnumber,
                ORQT: '1',
                UNM1: 'KG',
                UNM2: 'L'
            };

            const response: IMIResponse = await this.miService.executeRequestV2(myRequest);

            const errorMessage = response.errorMessage;
            if (errorMessage) {
                // Non classic UI has a different way of handling error messages as opposed to V2.
                throw { ...response };
            }

            const item = response.items?.[0];
            return item ? (item.ORQT || '').trim() : '';
        } catch (error) {
            this.log.Error(`${program}/${transaction} failed: ${JSON.stringify(error)}`);
            return null;
        }
    }

    private async PDS002MI_UpdateComponent({ PDS002 }): Promise<boolean> {
        const program = "PDS002MI";
        const transaction = "UpdateComponent";
        try {
            const myRequest = new MIRequest();
            myRequest.program = program;
            myRequest.transaction = transaction;
            // Input to the transaction
            myRequest.record = PDS002;

            const response: IMIResponse = await this.miService.executeRequestV2(myRequest);

            const errorMessage = response.errorMessage;
            if (errorMessage) {
                // Non classic UI has a different way of handling error messages as opposed to V2.
                throw { ...response };
            }

            this.log.Info(`${program}/${transaction} OK for: ${JSON.stringify(PDS002)}`);
            return true;
        } catch (error) {
            this.log.Error(`${program}/${transaction} failed: ${JSON.stringify(error)}`);
            return false;
        }
    }

    private getM3FieldValue = function (fieldName): string {
        const fieldValue = ScriptUtil.GetFieldValue(fieldName);
        const trimmedFieldValue = (fieldValue != null) ? fieldValue.trim() : fieldValue;
        return trimmedFieldValue;
    }
}
