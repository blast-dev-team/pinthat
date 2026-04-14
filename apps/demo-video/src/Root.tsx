import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PinThatDemo"
      component={DemoVideo}
      durationInFrames={525}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
