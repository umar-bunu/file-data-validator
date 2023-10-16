import { z } from "zod";

// add other schema
export type ISchema = z.infer<any> & {
  lineNo: string;
};

interface ILineRow {
  index: number;
  data: ISchema;
}

export interface IErrorSate {
  currentRow: ILineRow | null;
  invalidFields: Record<string, string | number>;
}

export type TErrorState = IErrorSate[] | string;

export interface IInitState {
  columns: string[];
  dataSource: ISchema[];
  errorState: TErrorState | undefined;
  schemaFixes: ISchema[];
}

export const TABLE_PAGE_SIZE = 100;

export interface IProps {
  file: File;
  schema: z.ZodSchema;
  /**A list of all the columns that are used in the schema
   * @example, if the schema is  z.object<Record<keyof typeof UserSchema, any>>({
    firstName: z.string().trim().min(2)})
    columnsObj should be {
      firstName: 'firstName'
    } or even better, use an enum
   */
  columnsKeys: Record<string, string>;
  /**An array containing list of all the columns that are actually required */
  requiredCols: (keyof this["columnsKeys"])[];
}
