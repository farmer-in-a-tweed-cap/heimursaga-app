import { IPayoutDetail } from '@repo/types';
import {
  Badge,
  DataTable,
  DataTableColumn,
  DataTableRow,
} from '@repo/ui/components';

import { dateformat } from '@/lib';

type Props = {
  data: IPayoutDetail[];
  loading?: boolean;
};

export const PayoutActivityTable: React.FC<Props> = ({
  data = [],
  loading = false,
}) => {
  const columns: DataTableColumn<IPayoutDetail>[] = [
    {
      accessorKey: 'amount',
      header: () => 'Amount',
      cell: ({ row }) => {
        const amount = row.original?.amount || '0.00';
        const symbol = row.original?.currency?.symbol || '';

        return (
          <span className="flex flex-row gap-0 items-center font-medium underline">
            {symbol}
            {amount}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: () => 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return <Badge variant="outline">{status}</Badge>;
      },
    },
    {
      accessorKey: 'created',
      header: () => 'Initiated',
      cell: ({ row }) =>
        dateformat(row.getValue('created')).format('MMM DD, YYYY'),
    },
    {
      accessorKey: 'arrival',
      header: () => 'Arrival',
      cell: ({ row }) =>
        dateformat(row.getValue('arrival')).format('MMM DD, YYYY'),
    },
  ];

  const rows: DataTableRow[] = data.map(
    ({ id, amount, status, currency, arrival, created }) => ({
      id,
      amount,
      status,
      currency,
      arrival,
      created,
    }),
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={loading}
      hidePagination={true}
    />
  );
};
