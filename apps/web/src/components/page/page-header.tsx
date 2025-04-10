export const PageHeaderTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="pt-10 pb-2 flex flex-row">
    <h2 className="font-medium text-xl sm:text-3xl">{children}</h2>
  </div>
);
