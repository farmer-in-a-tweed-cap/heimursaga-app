export const PageHeaderTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="pt-4 lg:pt-10 flex flex-row justify-center">
    <h2 className="font-medium text-xl sm:text-3xl text-center">{children}</h2>
  </div>
);
