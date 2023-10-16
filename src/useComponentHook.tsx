import { useCallback, useEffect, useState } from "react";
import { ZodError } from "zod";
import { IInitState, IProps, ISchema } from "./definitions";
import {
  getColsFromLine,
  handleFileRead,
  isFileExcel,
  removeTrailingCharacters,
  validateColumns,
} from "./functions";

const initialDataState: IInitState = {
  columns: [],
  dataSource: [],
  errorState: undefined,
  schemaFixes: [],
};

export default function useComponentHook({
  file,
  schema,
  ...restProps
}: IProps) {
  const { data, isLoading, localeMutate } = useGetCsvFile({
    file,
    schema,
    ...restProps,
  });
  useEffect(() => {
    if (file) {
      localeMutate();
    }
  }, [file, localeMutate]);

  return {
    data,
    isLoading,
  };
}

function useGetCsvFile({ file, schema, columnsKeys, requiredCols }: IProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setdata] = useState<IInitState>();
  useEffect(() => {
    if (isLoading) {
      const readNProcessFile: (prop: {
        result: FileReader["result"];
        isExcel: boolean;
      }) => Promise<IInitState> = async ({ isExcel, result }) => {
        const processedData = initialDataState;
        const fileContents = handleFileRead(result, isExcel);

        if (fileContents) {
          const lines = fileContents.split("\n");
          const cols = getColsFromLine(lines[0]);
          processedData.errorState = validateColumns(cols, {
            columnsKeys,
            requiredCols,
          });
          //if error was encountered, no need to continue
          if (processedData.errorState) {
            console.error(processedData.errorState);
            return processedData;
          }
          processedData.columns = cols;
          const rows = lines.slice(1);
          const data: ISchema[] = [],
            fixes: ISchema[] = [];
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const eachLine = rows[lineIndex];
            if (!eachLine) continue;
            /**if line is either empty or full of emtpy values */
            const isInvalidLine = removeTrailingCharacters(eachLine) === "";
            //if line is invalid, jump to next line
            if (isInvalidLine) continue;
            let currentRow: { index: number; data: ISchema } | null = null;
            try {
              const obj: any = { lineNo: `${lineIndex + 2}` };
              const lineVals = eachLine.split(",");
              lineVals.forEach((eachVal, valIndex) => {
                //if index exceeds the length of columns
                if (valIndex + 1 > cols.length) {
                  return;
                }
                //set the key and value of the item using index
                obj[cols[valIndex]] = removeTrailingCharacters(eachVal);
              });
              currentRow = { data: obj, index: lineIndex };
              data.push({ ...obj });
              fixes.push(
                (await schema.parseAsync({ ...obj })) as unknown as ISchema
              );
            } catch (error) {
              console.error("Error: ", error);
              if (error instanceof ZodError) {
                /**Invalid fields in the current row */
                const invalidFields: Record<string, string> = {};
                error.errors.forEach((singleError) => {
                  invalidFields[singleError.path[0]] = singleError.message;
                });

                if (Array.isArray(processedData.errorState))
                  processedData.errorState.push({ currentRow, invalidFields });
                else if (processedData.errorState === undefined)
                  processedData.errorState = [{ currentRow, invalidFields }];
              } else {
                if (!Array.isArray(processedData.errorState))
                  processedData.errorState = "An unexpected error occured";
              }
            }
          }
          processedData.dataSource = data;
          processedData.schemaFixes = fixes;
        }
        return await Promise.resolve(processedData);
      };

      const isExcel = isFileExcel(file);
      const reader = new FileReader();
      reader.addEventListener("load", (event) => {
        if (event.target) {
          readNProcessFile({ result: event.target.result, isExcel }).then(
            (newData) => {
              setIsLoading(false);
              setdata(newData);
            }
          );
        }
      });
      if (isExcel) {
        reader.readAsArrayBuffer(file);
      } else reader.readAsText(file, "utf-8");
    }
  }, [isLoading, file]);
  const localeMutate = useCallback(() => {
    setIsLoading(true);
  }, [setIsLoading]);

  return {
    localeMutate,
    isLoading,
    data,
  };
}

/**Allows for downloading of process file by holding ctrl+shift+s */
export const useDownloadFile = (file: File | null | undefined) => {
  const [ctrlKey, setCtrlKey] = useState(false);
  const [shiftKey, setShiftKey] = useState(false);
  const [sKey, setSKey] = useState(false);

  const handleKeyUp = () => {
    setCtrlKey(false);
    setShiftKey(false);
    setSKey(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (ctrlKey && shiftKey && sKey) {
        return downloadProcessFile();
      }
      if (event.key === "Control") {
        setCtrlKey(true);
      } else if (event.key === "Shift") {
        setShiftKey(true);
      } else if (event.key?.toLowerCase() === "s") {
        setSKey(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey, shiftKey, sKey]);

  function downloadProcessFile() {
    if (!file) {
      return;
    }
    const fileUrl = URL.createObjectURL(file);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = fileUrl;
    a.download = "P-" + file.name;

    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(fileUrl);
    document.body.removeChild(a);
    handleKeyUp();
  }
};
