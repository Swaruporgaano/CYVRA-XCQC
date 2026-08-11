import type {
  CertificateCompleteness,
  CreateSessionRequest,
  DeviceProfile,
  FinalizeSessionRequest,
  PlatformKind,
  ReportPayload,
  SessionEvent,
  SessionStatus,
} from "@cyvra/xcqc-shared";

export interface SessionRecord {
  sessionId: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  orgId?: string;
  operatorId?: string;
  profile: DeviceProfile;
  platform: PlatformKind;
  agentVersion?: string;
  deviceHint?: string;
  events: SessionEvent[];
  report?: ReportPayload;
  completeness?: CertificateCompleteness;
  certificateId?: string | null;
}

export type { CreateSessionRequest, FinalizeSessionRequest };
