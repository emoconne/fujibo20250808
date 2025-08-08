import { appVersionDetails } from "./app-version";

export const UpdateIndicatorAction = async (): Promise<JSX.Element | null> => {
  try {
    const appVersion = await appVersionDetails();

    if (!appVersion?.isOutdated) {
      return null;
    } else {
      return (
        <div className="absolute left-0 top-0  bg-red-400 rounded-full -translate-x-0.5 -translate-y-0.5">
          <div className="w-3  h-3 animate-ping bg-red-600 rounded-full "></div>
        </div>
      );
    }
  } catch (error) {
    console.error("Error in UpdateIndicatorAction:", error);
    return null;
  }
};
