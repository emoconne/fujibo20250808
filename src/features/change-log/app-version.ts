"use server";
import { APP_VERSION } from "@/app-global";

interface AppVersionDetails {
  version: string;
  isOutdated: boolean;
}

export const appVersionDetails = async (): Promise<AppVersionDetails> => {
  try {
    const appVersion = await fetch(
      "https://raw.githubusercontent.com/microsoft/azurechat/main/src/package.json",
      {
        cache: "no-cache",
      }
    );

    if (!appVersion.ok) {
      throw new Error(`Failed to fetch version: ${appVersion.status}`);
    }

    const version = (await appVersion.json()).version as string;
    const isOutdated = isVersionGreater(version, APP_VERSION);

    return { version, isOutdated };
  } catch (error) {
    console.error("Error fetching app version:", error);
    // エラーが発生した場合は、現在のバージョンが最新であると仮定
    return { 
      version: APP_VERSION, 
      isOutdated: false 
    };
  }
};

function isVersionGreater(version1: string, version2: string): boolean {
  const v1parts = version1.split(".");
  const v2parts = version2.split(".");

  for (let i = 0; i < v1parts.length; ++i) {
    if (parseInt(v1parts[i], 10) > parseInt(v2parts[i], 10)) {
      return true;
    }
    if (parseInt(v1parts[i], 10) < parseInt(v2parts[i], 10)) {
      return false;
    }
  }

  return false;
}
