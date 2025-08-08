import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, MessageCircle,File,Globe } from "lucide-react";
import { FC } from "react";
import { ChatType } from "../../chat-services/models";
import { useChatContext } from "../chat-context";
import { useSession } from "next-auth/react";

// 環境変数からラベルを取得
const SIMPLE_CHAT_LABEL = process.env.NEXT_PUBLIC_SIMPLE_CHAT_TYPE_LABEL || "通常利用";
const WEB_CHAT_LABEL = process.env.NEXT_PUBLIC_WEB_CHAT_TYPE_LABEL || "Web検索";
const DATA_CHAT_LABEL = process.env.NEXT_PUBLIC_DATA_CHAT_TYPE_LABEL || "ファイル読込";
const DOC_CHAT_LABEL = process.env.NEXT_PUBLIC_DOC_CHAT_TYPE_LABEL || "準備中";

interface Prop {
  disable: boolean;
}

export const ChatTypeSelector: FC<Prop> = (props) => {
  const { data: session } = useSession();
  const { chatBody, onChatTypeChange } = useChatContext();

  return (
    <Tabs
      defaultValue={chatBody.chatType}
      onValueChange={(value) => onChatTypeChange(value as ChatType)}
    >
      <TabsList className="grid w-full grid-cols-4 h-12 items-stretch">
        <TabsTrigger
          value="simple"
          className="flex gap-1"
          disabled={props.disable}
        >
          <MessageCircle size={20} /> {SIMPLE_CHAT_LABEL}
        </TabsTrigger>    
        <TabsTrigger
          value="web"
          className="flex gap-1"
          disabled={props.disable}
        >
          <Globe size={20} /> {WEB_CHAT_LABEL}
        </TabsTrigger>   
        <TabsTrigger
          value="data"
          className="flex gap-1"
          disabled={props.disable}
        >
          <FileText size={20} /> {DATA_CHAT_LABEL}
        </TabsTrigger>              

        <TabsTrigger
        value="doc"
        className="flex gap-1"
        disabled={props.disable}
        >
        <FileText size={20} /> {DOC_CHAT_LABEL}
        </TabsTrigger>   
        </TabsList>
    </Tabs>
  );
};
