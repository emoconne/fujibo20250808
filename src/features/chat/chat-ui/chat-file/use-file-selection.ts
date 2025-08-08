import { useGlobalMessageContext } from "@/features/global-message/global-message-context";
import {
  IndexDocuments,
  UploadDocument,
} from "../../chat-services/chat-document-service";
import { useChatContext } from "../chat-context";

interface Props {
  id: string;
}

export const useFileSelection = (props: Props) => {
  const { setChatBody, chatBody, fileState } = useChatContext();
  const { setIsUploadingFile, setUploadButtonLabel } = fileState;

  const { showError, showSuccess } = useGlobalMessageContext();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    onFileChange(formData);
  };

  const onFileChange = async (formData: FormData) => {
    try {
      console.log('=== onFileChange START ===');
      console.log('Chat thread ID:', props.id);
      
      setIsUploadingFile(true);
      setUploadButtonLabel("Uploading document...");
      formData.append("id", props.id);
      const file: File | null = formData.get("file") as unknown as File;
      
      console.log('File details:', {
        name: file?.name,
        type: file?.type,
        size: file?.size
      });
      
      console.log('Calling UploadDocument...');
      const uploadResponse = await UploadDocument(formData);
      console.log('Upload response:', uploadResponse);
      
      if (uploadResponse.success) {
        console.log('Upload successful, starting indexing...');
        console.log('Total chunks to index:', uploadResponse.response.length);
        
        let index = 0;
        let successCount = 0;
        let errorCount = 0;
        
        for (const doc of uploadResponse.response) {
          setUploadButtonLabel(
            `Indexing document [${index + 1}]/[${
              uploadResponse.response.length
            }]`
          );
          try {
            console.log(`Indexing chunk ${index + 1}/${uploadResponse.response.length}`);
            console.log('Chunk content length:', doc.length);
            console.log('Calling IndexDocuments with:', {
              fileName: file.name,
              docLength: doc.length,
              chatThreadId: props.id
            });
            
            const indexResponse = await IndexDocuments(
              file.name,
              [doc],
              props.id
            );

            console.log('IndexDocuments response:', indexResponse);

            if (!indexResponse.success) {
              console.error('Indexing failed:', indexResponse.error);
              errorCount++;
              showError(`インデックス作成に失敗しました: ${indexResponse.error}`);
              // エラーが発生しても処理を続行
            } else {
              console.log(`Chunk ${index + 1} indexed successfully`);
              successCount++;
            }
          } catch (e) {
            console.error('Indexing error:', e);
            console.error('Error details:', {
              name: e instanceof Error ? e.name : 'Unknown',
              message: e instanceof Error ? e.message : String(e),
              stack: e instanceof Error ? e.stack : undefined
            });
            errorCount++;
            showError(`インデックス作成中にエラーが発生しました: ${e}`);
            // エラーが発生しても処理を続行
          }

          index++;
        }

        console.log('Indexing completed:', {
          total: uploadResponse.response.length,
          success: successCount,
          error: errorCount
        });
        
        if (successCount > 0) {
          showSuccess({
            title: "File upload",
            description: `${file.name} uploaded successfully. ${successCount}/${uploadResponse.response.length} chunks indexed.`,
          });
          setUploadButtonLabel("");
          setChatBody({ ...chatBody, chatOverFileName: file.name });
        } else {
          showError(
            `インデックス作成に失敗しました。${errorCount}個のエラーが発生しました。`
          );
        }
      } else {
        console.error('Upload failed:', uploadResponse.error);
        showError(uploadResponse.error);
      }
    } catch (error) {
      console.error('onFileChange error:', error);
      showError("" + error);
    } finally {
      console.log('onFileChange completed');
      setIsUploadingFile(false);
      setUploadButtonLabel("");
    }
  };

  return { onSubmit };
};
