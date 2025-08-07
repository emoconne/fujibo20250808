import { Button } from "@/components/ui/button";
import { FC, useState , FormEvent, useRef , Fragment ,useEffect, useCallback, useMemo} from "react";
import { Card } from "@/components/ui/card";
interface Props {}
import { useParams, useRouter } from "next/navigation";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";
interface Prop {}
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { CheckIcon, ClipboardIcon, UserCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import {AddPrompt,queryPrompt,queryPromptCompany,markAsDeleted,updateItem, updateSortOrders} from "@/features/chat/chat-ui/chat-prompt/chat-prompt-cosmos";
import { PromptList } from "@/features/chat/chat-services/models";
import { Trash } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

type Prompt = {
  title: string;
  content: string;
  id: number;
  dept: string;
  username: string;
  sortOrder: number;
};  

const ChatPromptEmptyState: FC<Props> = (props) => {
  const [open, setOpen] = useState(true);
  const [open_personal, setOpen_personal] = useState(true);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptContent, setPromptContent] = useState("");
  const [dept, setDept] = useState("");
  const [promptId, setPromptId] = useState(0);
  
  // 統合されたプロンプトデータ管理
  const [personalPrompts, setPersonalPrompts] = useState<Prompt[]>([]);
  const [companyPrompts, setCompanyPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  
  // 入力値をuseRefで管理してパフォーマンスを改善
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  
  // Tailwindのtext-foregroundと同じ色を取得
  const getForegroundColor = () => {
    return 'hsl(var(--foreground))';
  };

  const { data: session } = useSession();

  const handleClick_company_all = () => {
    setOpen(!open);
  };
  const handleClick_personal_all = () => {
    setOpen_personal(!open_personal);
  };
  
  const listClick = (title:string,content:string,dept:string,id:number) => {
    if (id === 0) {
      // refとstateの両方をクリア
      if (titleRef.current) titleRef.current.value = "";
      if (contentRef.current) contentRef.current.value = "";
      setPromptTitle("");
      setPromptContent("");
      setDept(dept);
      setPromptId(0);
    } else {
      // refとstateの両方に値を設定
      if (titleRef.current) titleRef.current.value = title;
      if (contentRef.current) contentRef.current.value = content;
      setPromptTitle(title);
      setPromptContent(content);
      setDept(dept);
      setPromptId(id);
    }
  };  

  // データ取得を並列化して最適化した関数
  const fetchAllPrompts = useCallback(async () => {
    if (!session?.user?.name || isLoading) return;
    
    setIsLoading(true);
    try {
      // 個人と会社のデータを並列取得で高速化
      const [personalList, companyList] = await Promise.all([
        queryPrompt("個人", session.user.name),
        queryPromptCompany("会社全体")
      ]);

      const formattedPersonal = personalList.map(item => ({ 
        ...item, 
        id: Number(item.id), 
        username: item.username || "" 
      }));

      const formattedCompany = companyList.map(item => ({ 
        ...item, 
        id: Number(item.id), 
        username: item.username || "" 
      }));

      setPersonalPrompts(formattedPersonal);
      setCompanyPrompts(formattedCompany);

    } catch (error) {
      console.error("データ取得エラー:", error);
      setPersonalPrompts([]);
      setCompanyPrompts([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.name, isLoading]);

  // sessionが利用可能になったら初回データ取得（依存関係を最適化）
  useEffect(() => {
    if (session?.user?.name && !isLoading) {
      fetchAllPrompts();
    }
  }, [session?.user?.name]);

  const listDelete = async (id: string) => {
    if (window.confirm("削除しますか?")) {
      // 楽観的更新でUIを即座に更新
      const idNum = Number(id);
      const prevPersonal = [...personalPrompts];
      const prevCompany = [...companyPrompts];
      
      setPersonalPrompts(prev => prev.filter(item => item.id !== idNum));
      setCompanyPrompts(prev => prev.filter(item => item.id !== idNum));
      
      try {
        await markAsDeleted(id);
      } catch (error) {
        // エラー時は元の状態に戻す
        setPersonalPrompts(prevPersonal);
        setCompanyPrompts(prevCompany);
        console.error("エラーが発生しました:", error);
        alert("エラーが発生しました: " + error);
      }
    }
  }

  const [isIconChecked, setIsIconChecked] = useState(false);
  const toggleIcon = () => {
    setIsIconChecked((prevState) => !prevState);
  };

  const handleButtonClick = () => {
    toggleIcon();
    const content = contentRef.current?.value || promptContent;
    navigator.clipboard.writeText(content);
  }; 

  const saveButtonClick = async () => {
    const currentTimestamp = Date.now();
    const id = Number(currentTimestamp);
    
    const currentTitle = titleRef.current?.value || promptTitle;
    const currentContent = contentRef.current?.value || promptContent;
    
    if (!currentTitle.trim() || !currentContent.trim()) {
      alert("タイトルとプロンプトを入力してください");
      return;
    }

    const newPrompt = { 
      title: currentTitle,
      content: currentContent,
      id: "0",
      dept: dept.trim() === "" ? "個人" : dept,
      usename: "",
      createdAt: new Date(),
      isDeleted: false
    };

    try {
      setIsLoading(true);
      
      if (promptId === 0) {
        // 新規作成 - 楽観的更新でUIを即座に更新
        const optimisticPrompt = {
          title: currentTitle,
          content: currentContent,
          id: id,
          dept: newPrompt.dept,
          username: session?.user.name || "",
          sortOrder: personalPrompts.length
        };

        if (newPrompt.dept === "個人") {
          setPersonalPrompts(prev => [...prev, optimisticPrompt]);
        } else {
          setCompanyPrompts(prev => [...prev, optimisticPrompt]);
        }

        try {
          newPrompt.id = id.toString();
          newPrompt.usename = session?.user.name || "";
          await AddPrompt({
            ...newPrompt,
            sortOrder: 0
          });
        } catch (error) {
          // エラー時は追加した項目を削除
          if (newPrompt.dept === "個人") {
            setPersonalPrompts(prev => prev.filter(item => item.id !== id));
          } else {
            setCompanyPrompts(prev => prev.filter(item => item.id !== id));
          }
          throw error;
        }
        
        // 保存後にフォームをクリア
        if (titleRef.current) titleRef.current.value = "";
        if (contentRef.current) contentRef.current.value = "";
        setPromptTitle("");
        setPromptContent("");
        setDept("");
        setPromptId(0);
      } else {
        // 更新 - 楽観的更新
        const updatePrompt = (prompts: Prompt[]) =>
          prompts.map(item =>
            item.id === promptId
              ? { ...item, title: currentTitle, content: currentContent }
              : item
          );

        const prevPersonal = [...personalPrompts];
        const prevCompany = [...companyPrompts];

        setPersonalPrompts(updatePrompt);
        setCompanyPrompts(updatePrompt);

        try {
          await updateItem(promptId.toString(), currentTitle, currentContent);
        } catch (error) {
          // エラー時は元の状態に戻す
          setPersonalPrompts(prevPersonal);
          setCompanyPrompts(prevCompany);
          throw error;
        }
      }
      
      // 保存成功メッセージを表示
      setSaveMessage("保存されました");
      setTimeout(() => setSaveMessage(""), 3000);
      
    } catch (error) {
      console.error("エラーが発生しました:", error);
      alert("エラーが発生しました: " + error);
    } finally {
      setIsLoading(false);
    }
  }; 

  // ドラッグ＆ドロップ並び替えハンドラ（個人）
  const onDragEndPersonal = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(personalPrompts);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    // sortOrderを再付与
    const updates = items.map((item, idx) => ({ ...item, sortOrder: idx }));
    setPersonalPrompts(updates);
    await updateSortOrders(updates.map(item => ({ id: String(item.id), sortOrder: item.sortOrder })));
  };
  // ドラッグ＆ドロップ並び替えハンドラ（会社）
  const onDragEndCompany = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(companyPrompts);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    // sortOrderを再付与
    const updates = items.map((item, idx) => ({ ...item, sortOrder: idx }));
    setCompanyPrompts(updates);
    await updateSortOrders(updates.map(item => ({ id: String(item.id), sortOrder: item.sortOrder })));
  };

  // 個人プロンプト表示コンポーネント（ドラッグ＆ドロップ対応＋▲▼ボタン横並び）
  const PersonalPromptList = useMemo(() => (
    <DragDropContext onDragEnd={onDragEndPersonal}>
      <Droppable droppableId="personalPromptList">
        {(provided: any) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {personalPrompts
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item, idx) => (
                <Draggable key={item.id} draggableId={String(item.id)} index={idx}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        background: snapshot.isDragging ? '#e0f7fa' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 4,
                        borderRadius: 4,
                        boxShadow: snapshot.isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : undefined,
                      }}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => listClick(item.title, item.content, item.dept, item.id)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 0.5)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ minWidth: 24, textAlign: 'right', marginRight: 8, color: '#888' }}></span>
                      <span className="text-sm font-medium flex-1" style={{ color: getForegroundColor() }}>
                         {item.title}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 4, marginRight: 8 }}>
                        <button
                          onClick={e => { e.stopPropagation();
                            if (idx > 0) {
                              const items = Array.from(personalPrompts);
                              [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                              const updates = items.map((it, i) => ({ ...it, sortOrder: i }));
                              setPersonalPrompts(updates);
                              updateSortOrders(updates.map(it => ({ id: String(it.id), sortOrder: it.sortOrder })));
                            }
                          }}
                          disabled={idx === 0}
                          style={{ fontSize: 12, opacity: idx === 0 ? 0.3 : 1 }}
                        >▲</button>
                        <button
                          onClick={e => { e.stopPropagation();
                            if (idx < personalPrompts.length - 1) {
                              const items = Array.from(personalPrompts);
                              [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
                              const updates = items.map((it, i) => ({ ...it, sortOrder: i }));
                              setPersonalPrompts(updates);
                              updateSortOrders(updates.map(it => ({ id: String(it.id), sortOrder: it.sortOrder })));
                            }
                          }}
                          disabled={idx === personalPrompts.length - 1}
                          style={{ fontSize: 12, opacity: idx === personalPrompts.length - 1 ? 0.3 : 1 }}
                        >▼</button>
                      </div>
                      <Trash
                        size={14}
                        color={getForegroundColor()}
                        className="ml-2 hover:text-red-500 transition-colors duration-150"
                        style={{ marginRight: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          listDelete(item.id.toString());
                        }}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  ), [personalPrompts]);

  // 会社プロンプト表示コンポーネント（ドラッグ＆ドロップ対応＋▲▼ボタン横並び）
  const CompanyPromptList = useMemo(() => (
    <DragDropContext onDragEnd={onDragEndCompany}>
      <Droppable droppableId="companyPromptList">
        {(provided: any) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {companyPrompts
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item, idx) => (
                <Draggable key={item.id} draggableId={String(item.id)} index={idx}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        background: snapshot.isDragging ? '#e0f7fa' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 4,
                        borderRadius: 4,
                        boxShadow: snapshot.isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : undefined,
                      }}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => listClick(item.title, item.content, item.dept, item.id)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 0.5)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ minWidth: 24, textAlign: 'right', marginRight: 8, color: '#888' }}></span>
                      <span className="text-sm font-medium flex-1" style={{ color: getForegroundColor() }}>
                         {item.title}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 4, marginRight: 8 }}>
                        <button
                          onClick={e => { e.stopPropagation();
                            if (idx > 0) {
                              const items = Array.from(companyPrompts);
                              [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                              const updates = items.map((it, i) => ({ ...it, sortOrder: i }));
                              setCompanyPrompts(updates);
                              updateSortOrders(updates.map(it => ({ id: String(it.id), sortOrder: it.sortOrder })));
                            }
                          }}
                          disabled={idx === 0}
                          style={{ fontSize: 12, opacity: idx === 0 ? 0.3 : 1 }}
                        >▲</button>
                        <button
                          onClick={e => { e.stopPropagation();
                            if (idx < companyPrompts.length - 1) {
                              const items = Array.from(companyPrompts);
                              [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
                              const updates = items.map((it, i) => ({ ...it, sortOrder: i }));
                              setCompanyPrompts(updates);
                              updateSortOrders(updates.map(it => ({ id: String(it.id), sortOrder: it.sortOrder })));
                            }
                          }}
                          disabled={idx === companyPrompts.length - 1}
                          style={{ fontSize: 12, opacity: idx === companyPrompts.length - 1 ? 0.3 : 1 }}
                        >▼</button>
                      </div>
                      <Trash
                        size={14}
                        color={getForegroundColor()}
                        className="ml-2 hover:text-red-500 transition-colors duration-150"
                        style={{ marginRight: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          listDelete(item.id.toString());
                        }}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  ), [companyPrompts]);

  return (
    <div className="grid grid-cols-7 h-full w-full items-center container mx-auto max-w-4xl justify-center gap-1">
      <Card className="col-span-3 flex flex-col gap-1 p-o h-full w-full">
        <p className="text-xs text-muted-foreground">
          <div className="col-span-2 gap-1 flex flex-col flex-1 justify-start text-xs"> 
            <List 
              className="min-h-fit bg-background shadow-sm resize-none py-1 w-full"
              component="nav" 
            >
              <ListItemButton 
                onClick={handleClick_company_all}
                sx={{ 
                  minHeight: '32px', 
                  py: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <ListItemText 
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      color: getForegroundColor(),
                      fontSize: '0.875rem',
                      fontWeight: 500
                    },
                    margin: 0
                  }}
                  primary="会社全体" 
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ExpandLess 
                    sx={{ 
                      color: open ? getForegroundColor() : 'rgba(156, 163, 175, 0.5)', 
                      fontSize: '1.2rem',
                      cursor: 'pointer'
                    }} 
                  />
                  <ExpandMore 
                    sx={{ 
                      color: !open ? getForegroundColor() : 'rgba(156, 163, 175, 0.5)', 
                      fontSize: '1.2rem',
                      cursor: 'pointer'
                    }} 
                  />
                </div>
              </ListItemButton> 
              <Collapse in={open} timeout="auto" unmountOnExit>
                {session?.user?.isAdmin ? (
                  <div 
                    style={{
                      marginLeft: '2px',
                      paddingLeft: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 16px 6px 32px',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s'
                    }}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => listClick("", "", "会社全体", 0)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span 
                      className="text-sm font-medium"
                      style={{ color: getForegroundColor() }}
                    >
                      新規
                    </span>
                  </div>
                ) : null}
                <div style={{ marginLeft: '2px' }}>
                  {CompanyPromptList}
                </div>
              </Collapse>     
              <ListItemButton 
                onClick={handleClick_personal_all}
                sx={{ 
                  minHeight: '32px', 
                  py: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <ListItemText 
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      color: getForegroundColor(),
                      fontSize: '0.875rem',
                      fontWeight: 500
                    },
                    margin: 0
                  }}
                  primary="個人" 
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ExpandLess 
                    sx={{ 
                      color: open_personal ? getForegroundColor() : 'rgba(156, 163, 175, 0.5)', 
                      fontSize: '1.2rem',
                      cursor: 'pointer'
                    }} 
                  />
                  <ExpandMore 
                    sx={{ 
                      color: !open_personal ? getForegroundColor() : 'rgba(156, 163, 175, 0.5)', 
                      fontSize: '1.2rem',
                      cursor: 'pointer'
                    }} 
                  />
                </div>
              </ListItemButton>
              <Collapse in={open_personal} timeout="auto" unmountOnExit>
                <div 
                  style={{
                    marginLeft: '2px',
                    paddingLeft: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 16px 6px 32px',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s'
                  }}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => listClick("", "", "個人", 0)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(243, 244, 246, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span 
                    className="text-sm font-medium"
                    style={{ color: getForegroundColor() }}
                  >
                    新規
                  </span>
                </div>
                <div style={{ marginLeft: '2px'}}>
                  {PersonalPromptList}
                </div>
              </Collapse>                                
            </List>  
          </div>
        </p>
      </Card>
      <Card className="col-span-4 flex flex-col gap-1 p-5 h-full w-full">
        {saveMessage && (
          <div className="mb-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
            {saveMessage}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          <label className="text-sm font-medium text-foreground">タイトル</label>
          <div className="flex gap-3 items-center flex-1 p-0">
            <textarea
              ref={titleRef}
              name="title"
              className="text-sm font-medium text-foreground min-h-fit bg-background shadow-sm resize-none py-1 w-full"
              defaultValue={promptTitle}
              disabled={isLoading}
            ></textarea>
            <Button
              variant={"ghost"}
              size={"sm"}
              title="Copy text"
              className="justify-right flex"
              onClick={handleButtonClick}
              disabled={isLoading}
            >
              {isIconChecked ? (
                <CheckIcon size={16} />
              ) : (
                <ClipboardIcon size={16} />
              )}
            </Button>            
          </div>
        </p>
        <p className="text-xs text-muted-foreground">
          <input type="hidden" name="dept" value={dept}></input>
          <input type="hidden" name="id" value={promptId}></input>
        </p>
        <p className="text-xs text-muted-foreground">
          <label className="text-sm font-medium text-foreground">プロンプト</label>
          <textarea
            ref={contentRef}
            name="prompt"
            className="text-sm font-medium text-foreground min-h-fit w-full bg-background shadow-sm resize-none py-4 h-[60vh]"
            defaultValue={promptContent}
            disabled={isLoading}
          ></textarea>
        </p>
        <Button
          variant={"ghost"}
          size={"sm"}
          title="保存"
          className="justify-right flex bg-green-500 text-white disabled:bg-gray-400"
          onClick={saveButtonClick}
          disabled={isLoading}
        >
          {isLoading ? "処理中..." : "保存"}
        </Button>
      </Card>
    </div>
  );
};

export default ChatPromptEmptyState;