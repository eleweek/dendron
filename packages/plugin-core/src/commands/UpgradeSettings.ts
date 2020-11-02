import { createLogger } from "@dendronhq/common-server";
import _ from "lodash";
import path from "path";
import { Extension, extensions, window } from "vscode";
import {
  CodeConfigChanges,
  SettingsUpgradeOpts,
  WorkspaceConfig,
} from "../settings";
import { DendronWorkspace } from "../workspace";
import { BasicCommand } from "./base";

const L = createLogger("UpgradeSettingsCommand");

type UpgradeSettingsCommandOpts = {
  settingOpts: SettingsUpgradeOpts;
};
export type UpgradeSettingsCommandResp = {
  configUpdate: CodeConfigChanges;
};

export class UpgradeSettingsCommand extends BasicCommand<
  UpgradeSettingsCommandOpts,
  UpgradeSettingsCommandResp
> {
  async execute(opts: UpgradeSettingsCommandOpts) {
    const ctx = "Upgrade:execute";
    L.info({ ctx, opts });
    const config = DendronWorkspace.configuration();
    if (!config) {
      throw Error("no ws config found");
    }

    const newConfig = await WorkspaceConfig.update(
      path.dirname(DendronWorkspace.workspaceFile().fsPath)
    );
    this.L.info({ ctx, newConfig });
    const badExtensions: Extension<any>[] =
      (newConfig.extensions.unwantedRecommendations
        ?.map((ext) => {
          return extensions.getExtension(ext);
        })
        .filter(Boolean) as Extension<any>[]) || [];
    this.L.info({ ctx, badExtensions });
    if (!_.isEmpty(badExtensions)) {
      const msg = [
        "Manual action needed!",
        "The following extensions need to be uninstalled: ",
      ]
        .concat([
          badExtensions.map((ext) => ext.packageJSON.displayName).join(", "),
        ])
        .concat([
          "- Reload the window afterwards and Dendron will offer to install the Dendron version of the extension",
        ]);
      window.showWarningMessage(msg.join(" "));
    }
    return { configUpdate: newConfig };
  }
}
