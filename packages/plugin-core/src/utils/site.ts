import { execa } from "@dendronhq/engine-server";
import fs from "fs-extra";
import _ from "lodash";
import path from "path";
import { ProgressLocation, window } from "vscode";
import { DendronWorkspace } from "../workspace";

const packageJson = {
  name: "dendron-site",
  version: "1.0.0",
  main: "index.js",
  license: "MIT",
  dependencies: {
    "@dendronhq/dendron-11ty": "^1.23.3",
    "@dendronhq/dendron-cli": "^0.23.1-alpha.4",
  },
};

type NPMDep = { pkg: string; version: string };

const pkgCreate = (pkgPath: string) => {
  return fs.writeJSONSync(pkgPath, packageJson);
};
const pkgInstall = async () => {
  const cmdInstall = "npm install";
  await execa.command(cmdInstall, {
    shell: true,
    cwd: DendronWorkspace.wsRoot(),
  });
};

const pkgUpgrade = async (pkg: string, version: string) => {
  const cmdInstall = `npm install --save ${pkg}${_.replace(version, "^", "@")}`;
  await execa.command(cmdInstall, {
    shell: true,
    cwd: DendronWorkspace.wsRoot(),
  });
};

export const checkPreReq = async () => {
  // check for package.json
  const pkgPath = path.join(DendronWorkspace.wsRoot(), "package.json");
  if (!fs.existsSync(pkgPath)) {
    window.showInformationMessage("no package.json. creating package.json");
    pkgCreate(pkgPath);
    window.showInformationMessage("created package.json");
    const resp = await window.showInformationMessage(
      "install dependencies from package.json?",
      "Install",
      "Cancel"
    );
    if (resp !== "Install") {
      return undefined;
    }
    window.showInformationMessage("installing dependencies...");
    // TODO: show progress
    await pkgInstall();
  } else {
    // check dependencies
    const pkgContents = fs.readJSONSync(pkgPath);
    const pkgDeps = pkgContents.dependencies;
    const outOfDate: NPMDep[] = _.filter<NPMDep | undefined>(
      _.map(packageJson.dependencies, (v, k) => {
        if (pkgDeps[k] !== v) {
          return { pkg: k, version: v };
        }
        return undefined;
      }),
      (ent) => !_.isUndefined(ent)
    ) as NPMDep[];
    if (!_.isEmpty(outOfDate)) {
      const resp = await window.showInformationMessage(
        "Dependencies are out of date",
        "Update",
        "Cancel"
      );
      if (resp !== "Update") {
        return undefined;
      }
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: "upgrading dependencies",
          cancellable: false,
        },
        async (_progress, _token) => {
          await _.reduce(
            outOfDate,
            async (prev, opts) => {
              await prev;
              let { pkg, version } = opts;
              return pkgUpgrade(pkg, version);
            },
            Promise.resolve()
          );
        }
      );
      window.showInformationMessage("finish updating dependencies");
    } else {
      return undefined;
      // check NODE_MODULES TODO
    }
  }
  return undefined;
};
