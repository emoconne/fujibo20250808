import Typography from "@/components/typography";
import { Card } from "@/components/ui/card";
import { AI_NAME } from "@/features/theme/customise";
import { FC } from "react";
import { NewChat } from "../../chat-menu/new-chat";
import {
  LayoutDashboard,
  MessageCircle,
  PanelLeftClose,
  PanelRightClose,
  AppWindow,
} from "lucide-react";

interface Prop {}

export const StartNewChat: FC<Prop> = (props) => {

  const p_style = {fontSize: "15px"};
  return (
    <div className="grid grid-cols-1 w-full items-center container mx-auto max-w-4xl justify-center h-full gap-9 overflow-auto">
      <Card className="gap-5 p-5">
        <Typography variant="h4" className="text-primary">
        {AI_NAME}にようこそ！
        </Typography>
        <br/>
        <div className="flex flex-col gap-2">
          <p style={p_style}>
          富士紡ChatGPTは文章の要約や生成、Web検索が可能な富士紡グループ独自の生成AI(ChatGPT)です。<br/>
          </p>
          <p style={p_style}>
            以下の注意事項をご確認の上、富士紡ChatGPTのご利用をお願いいたします。
            <br/>
          </p>
          <p className="text-red-500" style={p_style}>※質問情報が社外に漏洩することがないセキュアな環境となります</p>
          <p className="text-red-500" style={p_style}>※富士紡ChatGPT以外の個人向け生成AIは、情報漏洩の危険性があるため、利用を控えてください</p>
          <p className="text-red-500" style={p_style}>※富士紡ChatGPT(Ver3.5)は画像生成に非対応です。画像生成が可能なVer4.0については今後検討します</p>
          <br/>
          <p style={p_style}>【注意事項】<br/>
          ・第三者の著作物を入力しない。固有名詞(既存著作物、作家名、作品の名称)を入力しない<br/>
          ・生成された回答結果に著作権侵害（既存の著作物との類似性・依拠性）がないか確認する<br/>
          ・回答結果の出典(根拠・裏付け)の確認や、回答結果の正確性を確認する<br/>
          ・業務以外のプライベートな利用は控える
          </p>
          <div className="flex justify-start flex-wrap gap-1 p-2">
           <div className="w-7 flex gap-0"><AppWindow /></div>
           <div className="w-auto flex">
            本画面の説明は
            <b>
             <a href="http://groupeip1.intrafujibo.co.jp/pdf/%E5%AF%8C%E5%A3%AB%E7%B4%A1ChatGPT_%E5%AF%8C%E5%A3%AB%E7%B4%A1ChatGPT%E3%81%AE%E7%94%BB%E9%9D%A2%E8%AA%AC%E6%98%8E.pdf" target="_blank" className="text-blue-600 hover:underline">
                こちら
             </a>
            </b>
            <br/>
            <br/>
           </div>
          </div>
        </div>
        <p>下記の➕を押して会話を開始できます</p>
        <div className="-mx-1 -mb-1 p-1 flex flex-col border-t bg-muted">
          <NewChat />
        </div>
      </Card>
    </div>
  );
};
