import pkg from "../../package.json" with { type: "json" };

export const PACKAGE_NAME: string = pkg.name;
export const PACKAGE_VERSION: string = pkg.version;
