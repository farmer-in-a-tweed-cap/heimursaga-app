type Props = {
  children: React.ReactNode;
};

// @todo: implement ssr react-query fetch
export const AppProvider: React.FC<Props> = ({ children }) => {
  return <>{children}</>;
};
