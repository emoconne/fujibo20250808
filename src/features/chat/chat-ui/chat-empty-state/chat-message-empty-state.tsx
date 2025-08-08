import Typography from "@/components/typography";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UpdateIndicator } from "../../../change-log/update-indicator";
import { Card } from "@/components/ui/card";
import { FC } from "react";
import { useChatContext } from "../chat-context";
import { ChatFileUI } from "../chat-file/chat-file-ui";
import { ChatStyleSelector } from "./chat-style-selector";
import { ChatTypeSelector } from "./chat-type-selector";
import { AI_NAME } from "@/features/theme/customise";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  MessageCircle,
  PanelLeftClose,
  PanelRightClose,
  Info,
  HelpCircle,
  AppWindow,
} from "lucide-react";

interface Prop {}

export const ChatMessageEmptyState: FC<Prop> = (props) => {
  const { fileState } = useChatContext();
  const { data: session } = useSession();

  const { showFileUpload } = fileState;

  return (
    <div className="grid grid-cols-1 w-full items-center container mx-auto max-w-4xl justify-center h-full gap-9 overflow-auto">
      <Card className="col-span-3 flex flex-col gap-2 p-5 ">
        <Typography variant="h4" className="text-primary">
          {AI_NAME}にようこそ！
        </Typography>
        {/* <p className="text-xs text-muted-foreground">
            このChatGPT搭載のAIチャットボットは、2024年1月からプレビューで社内利用限定で公開されています。
            まだまだ未熟なAIですが、皆様のご協力により、AIの成長を目指しています。
            ご利用の際は、以下の項目を選択してください。。
            </p>
        */}{/* */} 
        <p className="text-sm">
        富士紡ChatGPTは文章の要約や生成、WEB検索が可能な富士紡グループ独自の生成AI(ChatGPT)です。<br/>
        </p>
        <p className="text-sm">
        以下の注意事項をご確認の上、富士紡ChatGPTのご利用をお願いいたします。
        <br/>
        </p>
        <p className="text-sm text-red-500">※質問情報が社外に漏洩することがないセキュアな環境となります</p>
        <p className="text-sm text-red-500">※富士紡ChatGPT以外の個人向け生成AIは、情報漏洩の危険性があるため、利用を控えてください</p>
        <p className="text-sm text-red-500">※富士紡ChatGPT(Ver3.5)は画像生成に非対応です。画像生成が可能なVer4.0については今後検討します<br/><br/></p>
        <p className="text-sm">【注意事項】<br/>
          ・第三者の著作物を入力しない。固有名詞(既存著作物、作家名、作品の名称)を入力しない<br/>
          ・生成された回答結果に著作権侵害（既存の著作物との類似性・依拠性）がないか確認する<br/>
          ・回答結果の出典(根拠・裏付け)の確認や、回答結果の正確性を確認する<br/>
          ・業務以外のプライベートな利用は控える
        </p>
        <div className="flex justify-center flex-wrap gap-1 p-2">
          <div className="w-7 flex"><AppWindow /></div>
          <div className="w-auto flex pr-4">
            本画面の説明は
            <b>
              <a href="http://groupeip1.intrafujibo.co.jp/pdf/%E5%AF%8C%E5%A3%AB%E7%B4%A1ChatGPT_%E5%AF%8C%E5%A3%AB%E7%B4%A1ChatGPT%E3%81%AE%E7%94%BB%E9%9D%A2%E8%AA%AC%E6%98%8E.pdf" target="_blank" className="text-blue-600 hover:underline">
                こちら
              </a>
            </b>
          </div>
          <div className="w-7 flex"><HelpCircle /></div>
          <div className="w-auto flex pr-4">
            会話スタイル・利用機能の説明は
            <b>
              <a href="http://groupeip1.intrafujibo.co.jp/pdf/%E5%AF%8C%E5%A3%AB%E7%B4%A1ChatGPT_%E4%BC%9A%E8%A9%B1%E3%82%B9%E3%82%BF%E3%82%A4%E3%83%AB%E3%83%BB%E5%88%A9%E7%94%A8%E6%A9%9F%E8%83%BD%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6.pdf" target="_blank" className="text-blue-600 hover:underline">
                こちら
              </a>
            </b>
          </div>
          <div className="w-7 flex"><Info /></div>
          <div className="w-auto flex">
            活用事例は
            <b>
              <a href="http://groupeip1.intrafujibo.co.jp/pdf/%E5%AF%8C%E5%A3%AB%E7%B4%A1ChatGPT_%E6%B4%BB%E7%94%A8%E4%BA%8B%E4%BE%8B.pdf" target="_blank" className="text-blue-600 hover:underline">
                こちら
              </a>
            </b>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
          会話スタイルを選択してください。
          </p>
          <ChatStyleSelector disable={false} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            利用機能を選択してください。
          </p>
          <ChatTypeSelector disable={false} />
        </div>
        {showFileUpload === "data" && <ChatFileUI />}
      </Card>
    </div>
  );
};
