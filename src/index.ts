import { IProps } from "./definitions";
import useComponentHook from "./useComponentHook";

const useDataValidator = (props: IProps) => {
  const { data, isLoading } = useComponentHook(props);
  return {
    data,
    isLoading,
  };
};

export default useDataValidator;
