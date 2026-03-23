import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DeliveryHomeV2 from './pages/DeliveryHomeV2';
import { PayoutV2 } from './pages/pocket/PayoutV2';
import { PocketStatementV2 } from './pages/pocket/PocketStatementV2';
import { DeductionStatementV2 } from './pages/pocket/DeductionStatementV2';
import { LimitSettlementV2 } from './pages/pocket/LimitSettlementV2';
import { PocketBalanceV2 } from './pages/pocket/PocketBalanceV2';
import { CashLimitInfoV2 } from './pages/pocket/CashLimitInfoV2';
import { ProfileBankV2 } from './pages/profile/ProfileBankV2';
import { ProfileDocsV2 } from './pages/profile/ProfileDocsV2';
import { SupportTicketsV2 } from './pages/help/SupportTicketsV2';
import { CreateSupportTicketV2 } from './pages/help/CreateSupportTicketV2';
import { ViewSupportTicketV2 } from './pages/help/ViewSupportTicketV2';
import ShowIdCardV2 from './pages/help/ShowIdCardV2';
import { PocketDetailsV2 } from './pages/pocket/PocketDetailsV2';
import { ProfileDetailsV2 } from './pages/profile/ProfileDetailsV2';
import { HistoryV2 } from './pages/HistoryV2';



const DeliveryV2Router = () => {
  return (
    <Routes>
      {/* Main Multi-Tab Core (Feed, Pocket, History, Profile) */}
      <Route path="/" element={<DeliveryHomeV2 tab="feed" />} />
      <Route path="/feed" element={<DeliveryHomeV2 tab="feed" />} />
      <Route path="/pocket" element={<DeliveryHomeV2 tab="pocket" />} />
      <Route path="/history" element={<DeliveryHomeV2 tab="history" />} />
      <Route path="/profile" element={<DeliveryHomeV2 tab="profile" />} />
      <Route path="/profile/details" element={<ProfileDetailsV2 />} />
      <Route path="/profile/bank" element={<ProfileBankV2 />} />
      <Route path="/profile/documents" element={<ProfileDocsV2 />} />
      
      {/* Support Systems */}
      <Route path="/help/tickets" element={<SupportTicketsV2 />} />
      <Route path="/help/tickets/create" element={<CreateSupportTicketV2 />} />
      <Route path="/help/tickets/:ticketId" element={<ViewSupportTicketV2 />} />
      <Route path="/help/id-card" element={<ShowIdCardV2 />} />
      
      {/* Financial Deep-Pages */}
      <Route path="/pocket/payout" element={<PayoutV2 />} />
      <Route path="/pocket/statement" element={<PocketStatementV2 />} />
      <Route path="/pocket/deductions" element={<DeductionStatementV2 />} />
      <Route path="/pocket/limit-settlement" element={<LimitSettlementV2 />} />
      <Route path="/pocket/balance" element={<PocketBalanceV2 />} />
      <Route path="/pocket/cash-limit" element={<CashLimitInfoV2 />} />
      <Route path="/pocket/details" element={<PocketDetailsV2 />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/delivery-v2" replace />} />
    </Routes>
  );
};

export default DeliveryV2Router;
