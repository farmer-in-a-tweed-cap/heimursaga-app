import { ReactQueryProvider } from './react-query-provider';

type Props = {
  children: React.ReactNode;
};

export const AppProvider: React.FC<Props> = ({ children }) => {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
};
