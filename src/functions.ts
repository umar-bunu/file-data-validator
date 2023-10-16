import * as XLSX from "xlsx";
/**@description - To check if a file is an excel file
 * @param {File} fileToCheck
 * @returns - true if file type is excel, false otherwise
 */
export const isFileExcel = (fileToCheck: File) =>
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ].includes(fileToCheck.type);

/**
 *
 * @param {(string | ArrayBuffer | null | undefined)} fileContent - The file content to be read
 * @param {boolean} isExcel
 * @returns string[]
 */
export const handleFileRead = (
  fileContent: string | ArrayBuffer | null | undefined,
  isExcel: boolean
) => {
  if (isExcel) {
    const workbook = XLSX.read(fileContent, { type: "array" });

    // Process the data as needed (e.g., get sheets, rows, etc.)
    const firstSheetName = workbook.SheetNames[0];
    const sheetData = workbook.Sheets[firstSheetName];
    const stringData = XLSX.utils.sheet_to_txt(sheetData).replaceAll("\t", ",");
    return stringData;
    // replace all escape newline characters with a uniform newline escape character
  } else
    return removeCommasBetweenQuotes(
      (fileContent || "")?.toString()
    ).replaceAll("\r\n", "\n");
};

// function to remove commas and semicolons in between quotation marks
export const removeCommasBetweenQuotes = (line: string) => {
  const regex = /"[^"]*"/g; // Regular expression for quoted strings
  return line.replaceAll(regex, (match) => match.replaceAll(/[";,]/g, ""));
};

/**
 * Gets the columns passed from the file
 * @param {string} line The first line of the file which contains the columns
 * @returns {*}
 */
export const getColsFromLine = (line: string) => {
  return line
    .split(getCSVSeparator(line))
    .filter((eachCol) => removeTrailingCharacters(eachCol) !== "")
    .map((eachKey) => eachKey.trim());
};

/**
 *Gets what is passed as the separator, supporting either ; or ,
 * @param {string} line the line to check from
 * @returns semicolon (;) or comma (,)
 */
export function getCSVSeparator(line: string): ";" | "," {
  return line.includes(";") ? ";" : ",";
}

//function to remove all extra commas (,) and semicolons(;)
export const removeTrailingCharacters = (line: string) =>
  line.replaceAll(/[,;]/g, "").trim();

interface IvalidateCols {
  columnsKeys: Record<string, string>;
  requiredCols: (keyof this["columnsKeys"])[];
}
/**Checks all columns and return the invalid ones
 */
export const validateColumns = (
  columns: string[],
  { columnsKeys, requiredCols }: IvalidateCols
) => {
  const invalidFields: string[] = [],
    duplicateFields = new Set<string>(),
    missingCols: string[] = [];
  const allKeys = Object.keys(columnsKeys);
  for (const eachCol of columns) {
    if (!allKeys.includes(eachCol)) {
      invalidFields.push(eachCol);
    }
    //if column exists more than once, add to duplicate fields
    if (columns.filter((col) => col === eachCol).length > 1)
      duplicateFields.add(eachCol);
  }
  //Add "..."for new line
  if (invalidFields.length)
    return `These columns are invalid: (${invalidFields.join(
      ", "
    )})...Supported columns are: (${allKeys.join(", ")})`;
  if (duplicateFields.size)
    return `The following columns appear to be duplicate, this could result in an error:...${Array.from(
      duplicateFields
    ).join(", ")}`;

  //check for missing required columns
  for (const rField of requiredCols) {
    if (!columns.includes(rField)) missingCols.push(rField);
  }

  if (missingCols.length)
    return `The following fields are requried but missing:...${missingCols.join(
      ", "
    )}`;

  return undefined;
};

/**
 * @param {string[]} columns - The columns to add in the csv file
 * @param {string[][]} rows - the data to have in the rows of the csv file
 * @returns {File}
 */
export function createCsvFile(columns: string[], rows: string[][]): File {
  const csvFileData: string[][] = [
    columns,
    ...rows.map((eachRow) => {
      return Object.values(eachRow);
    }),
  ];
  const data = csvFileData.map((eachRow) => eachRow.join(",")).join("\n");
  //if error occured. return the already uploaded csv file
  const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
  const file: File & { uid?: string } = new File([blob], "csv-upload.csv", {
    type: "text/csv",
  });
  //add a uid to the file to avoid animation errors
  file.uid = Date.now().toString(36);
  return file;
}
