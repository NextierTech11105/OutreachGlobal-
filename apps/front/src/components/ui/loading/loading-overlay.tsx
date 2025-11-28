import { Loading } from "./loading";

export const LoadingOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
      <Loading />
    </div>
  );
};
