import { adminAuditApi } from "./api/adminAudit";
import { authApi } from "./api/auth";
import { ApiError, setTokenRefreshCallback } from "./api/client";
import { disputesApi } from "./api/disputes";
import { getApiBaseUrl, getStellarNetworkPassphrase, getStellarRpcUrl } from "./api/env";
import { searchApi } from "./api/search";
import { streamsApi } from "./api/streams";
import { tradesApi } from "./api/trades";
import { walletApi } from "./api/wallet";

export type {
  AdminAuditEntry,
  AdminAuditListResponse,
  ChallengeResponse,
  CreateTradeRequest,
  CreateTradeResponse,
  DepositResponse,
  DisputeListResponse,
  DisputeResponse,
  EvidenceRecord,
  EvidenceResponse,
  PathPaymentQuote,
  SearchResponse,
  SearchResultItem,
  TradeHistoryEvent,
  TradeHistoryResponse,
  TradeListResponse,
  TradeResponse,
  TradeStatsResponse,
  VerifyResponse,
} from "./api/types";

export type {
  ClawbackPreviewRequest,
  ClawbackPreviewResponse,
  ResumeStreamRequest,
  ResumeStreamResponse,
  StreamRemainingResponse,
  StreamResponse,
  SuspendStreamRequest,
  SuspendStreamResponse,
} from "./api/streams";

export const api = {
  auth: authApi,
  adminAudit: adminAuditApi,
  search: searchApi,
  streams: streamsApi,
  trades: tradesApi,
  wallet: walletApi,
};

export const apiConfig = {
  getBaseUrl: getApiBaseUrl,
  getStellarRpcUrl,
  getStellarNetworkPassphrase,
};

export { ApiError, setTokenRefreshCallback };
