interface Props {
  children: React.ReactNode;
}

// @todo: redirect to login page
// const redirectToLogin = () => window.location.replace(signinUrl({ from: window.location.pathname }))

export const AuthProvider = ({ children }: Props) => {
  //   const session = apiClient.getSession({ cookie }).catch(() => ({}));

  return <>{children}</>;
};
