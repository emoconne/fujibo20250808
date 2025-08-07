import { MainMenu } from "@/features/main-menu/menu";
import { AI_NAME } from "@/features/theme/customise";

export const metadata = {
  title: `${AI_NAME} - ドキュメント管理`,
  description: `${AI_NAME} ドキュメント管理`,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MainMenu />
      <div className="flex-1">{children}</div>
    </>
  );
} 