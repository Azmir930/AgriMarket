import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  products: { name: string; quantity: number }[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
}

const statusConfig: Record<Order['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'default' },
  shipped: { label: 'Shipped', variant: 'outline' },
  delivered: { label: 'Delivered', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

interface OrdersTableProps {
  orders: Order[];
  onViewOrder?: (order: Order) => void;
  onUpdateStatus?: (order: Order, status: Order['status']) => void;
  showCustomer?: boolean;
  className?: string;
}

export const OrdersTable = ({
  orders,
  onViewOrder,
  onUpdateStatus,
  showCustomer = true,
  className,
}: OrdersTableProps) => {
  return (
    <div className={cn('rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            {showCustomer && <TableHead>Customer</TableHead>}
            <TableHead>Products</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const config = statusConfig[order.status];
            return (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                {showCustomer && <TableCell>{order.customerName}</TableCell>}
                <TableCell>
                  <div className="max-w-[200px] truncate">
                    {order.products.map((p) => `${p.name} (${p.quantity})`).join(', ')}
                  </div>
                </TableCell>
                <TableCell className="font-medium">₹{order.total}</TableCell>
                <TableCell>
                  <Badge
                    variant={config.variant}
                    className={cn(
                      order.status === 'delivered' && 'bg-success text-success-foreground',
                      order.status === 'processing' && 'bg-info text-info-foreground'
                    )}
                  >
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{order.date}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewOrder?.(order)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {onUpdateStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <>
                          {order.status === 'pending' && (
                            <DropdownMenuItem onClick={() => onUpdateStatus(order, 'processing')}>
                              Mark Processing
                            </DropdownMenuItem>
                          )}
                          {order.status === 'processing' && (
                            <DropdownMenuItem onClick={() => onUpdateStatus(order, 'shipped')}>
                              Mark Shipped
                            </DropdownMenuItem>
                          )}
                          {order.status === 'shipped' && (
                            <DropdownMenuItem onClick={() => onUpdateStatus(order, 'delivered')}>
                              Mark Delivered
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={showCustomer ? 7 : 6} className="h-24 text-center text-muted-foreground">
                No orders found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
