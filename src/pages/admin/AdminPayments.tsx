import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Search, Eye, RefreshCcw, DollarSign, CreditCard, Clock, CheckCircle, XCircle, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  transactionId: string;
  orderNumber: string;
  buyer: string;
  buyerEmail: string;
  amount: number;
  method: 'card' | 'bank_transfer' | 'cash_on_delivery' | 'wallet';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
  paidAt?: string;
  cardLast4?: string;
  bankName?: string;
}

const statusColors: Record<Payment['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

const methodIcons: Record<Payment['method'], React.ReactNode> = {
  card: <CreditCard className="h-4 w-4" />,
  bank_transfer: <DollarSign className="h-4 w-4" />,
  cash_on_delivery: <Wallet className="h-4 w-4" />,
  wallet: <Wallet className="h-4 w-4" />,
};

const methodLabels: Record<Payment['method'], string> = {
  card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  cash_on_delivery: 'Cash on Delivery',
  wallet: 'Wallet',
};

const AdminPayments = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  // Load payments from API on mount
  useEffect(() => {
    const loadPayments = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/payments.php?page=1&limit=100`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.success && data.data && data.data.length > 0) {
          // Map API response to component interface
          const mappedPayments = data.data.map((item: any) => ({
            id: item.id,
            transactionId: item.transaction_id || item.id,
            orderNumber: item.order_id || '',
            buyer: `${item.first_name} ${item.last_name}`.trim(),
            buyerEmail: item.email || '',
            amount: parseFloat(item.amount) || 0,
            method: item.payment_method || 'card',
            status: item.status || 'pending',
            createdAt: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            paidAt: item.status === 'completed' ? item.updated_at?.split('T')[0] : undefined,
          }));

          setPayments(mappedPayments);
        }
      } catch (error) {
        console.error('Failed to load payments from API:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPayments();
  }, []);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.buyer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const stats = {
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    completed: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    pending: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    refunded: payments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + p.amount, 0),
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewDialogOpen(true);
  };

  const handleUpdateClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setNewStatus(payment.status);
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (selectedPayment && newStatus) {
      if (isUsingMockData) {
        toast({
          title: 'Demo Mode',
          description: 'Payment status updates require real API connection. Log in to use this feature.',
          variant: 'default',
        });
        return;
      }

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/payments.php?id=${selectedPayment.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedPayment.id,
            status: newStatus,
          }),
        });

        const data = await response.json();
        console.log('Update Payment API Response:', data);

        if (response.ok && data.success) {
          const now = new Date().toISOString().split('T')[0];
          setPayments(payments.map(p =>
            p.id === selectedPayment.id
              ? {
                ...p,
                status: newStatus as Payment['status'],
                paidAt: newStatus === 'completed' ? now : p.paidAt,
              }
              : p
          ));
          toast({
            title: 'Payment Updated',
            description: `Payment ${selectedPayment.transactionId} status changed to ${newStatus}.`,
          });
          setIsUpdateDialogOpen(false);
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to update payment status',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to update payment status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update payment status',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment Tracking</h1>
            <p className="text-muted-foreground">Monitor transactions and manage payment statuses</p>
          </div>
          {isUsingMockData && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
              Demo Mode - Real Data Unavailable
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">Tk{stats.total.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Volume</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Tk{stats.completed.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Tk{stats.pending.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <RefreshCcw className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Tk{stats.refunded.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Refunded</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions, orders, or buyers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">{payment.transactionId}</TableCell>
                    <TableCell className="font-medium">{payment.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.buyer}</p>
                        <p className="text-sm text-muted-foreground">{payment.buyerEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">Tk{payment.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {methodIcons[payment.method]}
                        <span className="text-sm">{methodLabels[payment.method]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[payment.status]} hover:${statusColors[payment.status]}`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewPayment(payment)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateClick(payment)}
                          disabled={payment.status === 'refunded'}
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Payment Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-mono font-medium">{selectedPayment.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-medium">{selectedPayment.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Buyer</p>
                    <p className="font-medium">{selectedPayment.buyer}</p>
                    <p className="text-sm text-muted-foreground">{selectedPayment.buyerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold text-primary">Tk{selectedPayment.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <div className="flex items-center gap-2 mt-1">
                      {methodIcons[selectedPayment.method]}
                      <span>{methodLabels[selectedPayment.method]}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={`${statusColors[selectedPayment.status]} mt-1`}>
                      {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                    </Badge>
                  </div>
                  {selectedPayment.cardLast4 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Card</p>
                      <p className="font-medium">**** **** **** {selectedPayment.cardLast4}</p>
                    </div>
                  )}
                  {selectedPayment.bankName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bank</p>
                      <p className="font-medium">{selectedPayment.bankName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{selectedPayment.createdAt}</p>
                  </div>
                  {selectedPayment.paidAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Paid At</p>
                      <p className="font-medium">{selectedPayment.paidAt}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Payment Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Transaction: {selectedPayment?.transactionId}</p>
                <p className="font-medium">Amount: ${selectedPayment?.amount.toFixed(2)}</p>
              </div>
              <div>
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleUpdateStatus}>Update Status</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayments;
