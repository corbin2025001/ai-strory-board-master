
export enum ShotSize {
  ExtremeWide = "Extreme Wide Shot",
  Wide = "Wide Shot",
  Full = "Full Shot",
  Medium = "Medium Shot",
  CloseUp = "Close-up",
  ExtremeCloseUp = "Extreme Close-up",
  LowAngle = "Low Angle",
  HighAngle = "High Angle",
  OverTheShoulder = "Over the Shoulder",
  PointOfView = "POV",
  BirdEye = "Bird's Eye View"
}

export const ShotSizeLabels: Record<ShotSize, { en: string; cn: string }> = {
  [ShotSize.ExtremeWide]: { en: "Extreme Wide Shot", cn: "大远景" },
  [ShotSize.Wide]: { en: "Wide Shot", cn: "全景" },
  [ShotSize.Full]: { en: "Full Shot", cn: "全身镜头" },
  [ShotSize.Medium]: { en: "Medium Shot", cn: "中景" },
  [ShotSize.CloseUp]: { en: "Close-up", cn: "特写" },
  [ShotSize.ExtremeCloseUp]: { en: "Extreme Close-up", cn: "大特写" },
  [ShotSize.LowAngle]: { en: "Low Angle", cn: "仰拍" },
  [ShotSize.HighAngle]: { en: "High Angle", cn: "俯拍" },
  [ShotSize.OverTheShoulder]: { en: "Over the Shoulder", cn: "过肩镜头" },
  [ShotSize.PointOfView]: { en: "POV", cn: "主观视角" },
  [ShotSize.BirdEye]: { en: "Bird's Eye View", cn: "鸟瞰图" }
};

export type GridLayout = '3x3' | '2x2';
export type AspectRatio = '16:9' | '9:16' | '4:3' | '3:4' | '1:1';

export interface TransitionResult {
  fromShot: number;
  toShot: number;
  prompt: {
    en: string;
    cn: string;
  };
}

export interface StoryboardResult {
  scenePrompt: {
    en: string;
    cn: string;
  };
  shots: {
    id: number;
    description: {
      en: string;
      cn: string;
    };
  }[];
  transitions: TransitionResult[];
}

export interface AnalysisStatus {
  step: 'idle' | 'analyzing' | 'generating' | 'completed' | 'error';
  message: string;
}
