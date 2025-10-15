import { Tag, Typography } from 'antd';
import { ColumnsType, TableProps } from 'antd/es/table';
import ROUTES from 'constants/routes';
import { getMs } from 'utils/timeUtils';
import { RowData } from './types';
import { formUrlParams } from 'utils/form';
import { QueryParams } from 'constants/query';

const { Paragraph } = Typography;

export function BlockLink({
  to,
  children,
  ...props
}: {
  to: string;
  children: React.ReactNode;
  openInNewTab?: boolean;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Handle navigation logic here
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer' }} {...props}>
      {children}
    </div>
  );
}

export const transformDataWithDate = (
  data: QueryDataV3[],
): Omit<RowData, 'timestamp'>[] =>
  data[0]?.list?.map(({ data, timestamp }) => ({ 
    ...data, 
    date: timestamp,
    // Add numeric timestamp for potential client-side operations
    numericTimestamp: new Date(timestamp).getTime(),
  })) || [];

export const getTraceLink = (record: RowData): string =>
  `${ROUTES.TRACE}/${record.traceID}${formUrlParams({
    [QueryParams.startTime]: String(record.timestamp),
    [QueryParams.endTime]: String(record.timestamp + 1),
  })}`;

export const getListColumns = (
  selectedColumns: Array<{ key: string; dataType: string; type: string }>,
  orderByFromQuery?: Array<{ key: { name: string }, direction: string }>,
): ColumnsType<RowData> => {
  
  // Helper function to get current sort order for a column
  const getSortOrder = (columnKey: string): 'ascend' | 'descend' | null => {
    const orderItem = orderByFromQuery?.find(order => order.key.name === columnKey);
    if (!orderItem) return null;
    return orderItem.direction === 'asc' ? 'ascend' : 'descend';
  };

  const initialColumns: ColumnsType<RowData> = [
    {
      key: 'date',
      title: 'Timestamp',
      width: 145,
      dataIndex: 'date',
      // Enable server-side sorting for timestamp
      sorter: true,
      sortOrder: getSortOrder('timestamp'),
      sortDirections: ['ascend', 'descend'],
      render: (value, item): JSX.Element => {
        const date =
          typeof value === 'string'
            ? new Date(value)
            : new Date(value / 1000000); // Convert from nanoseconds if needed
        
        return (
          <BlockLink to={getTraceLink(item)} openInNewTab={false}>
            <span data-testid="timestamp">
              {date.toLocaleString()}
            </span>
          </BlockLink>
        );
      },
    },
    {
      key: 'traceID',
      title: 'TraceId',
      width: 200,
      dataIndex: 'traceID',
      render: (value, item): JSX.Element => (
        <BlockLink to={getTraceLink(item)} openInNewTab={false}>
          <Paragraph 
            data-testid="traceID" 
            copyable={{ text: value }}
            style={{ margin: 0, color: '#1890ff' }}
          >
            {value?.slice(0, 6)}...
          </Paragraph>
        </BlockLink>
      ),
    },
  ];

  const columns: ColumnsType<RowData> = 
    selectedColumns.map(({ dataType, key, type }) => {
      const isDurationKey = key === 'durationNano' || key === 'duration_nano';
      
      return {
        title: key,
        dataIndex: key,
        key: `${key}-${dataType}-${type}`,
        width: 145,
        // Enable server-side sorting for duration columns
        sorter: isDurationKey,
        sortOrder: isDurationKey ? getSortOrder(key) : undefined,
        sortDirections: isDurationKey ? ['ascend', 'descend'] : undefined,
        render: (value, item): JSX.Element => {
          if (value === '') {
            return (
              <BlockLink to={getTraceLink(item)} openInNewTab={false}>
                <span data-testid={key}>N/A</span>
              </BlockLink>
            );
          }

          if (key === 'httpMethod' || key === 'responseStatusCode') {
            return (
              <BlockLink to={getTraceLink(item)} openInNewTab={false}>
                <Tag data-testid={key} color="magenta">
                  {value}
                </Tag>
              </BlockLink>
            );
          }

          if (isDurationKey) {
            return (
              <BlockLink to={getTraceLink(item)} openInNewTab={false}>
                <span data-testid={key}>{getMs(value)}ms</span>
              </BlockLink>
            );
          }

          return (
            <BlockLink to={getTraceLink(item)} openInNewTab={false}>
              <span data-testid={key}>
                <Paragraph text={value} lines={3} />
              </span>
            </BlockLink>
          );
        },
        responsive: ['md'],
      };
    }) || [];

  return [...initialColumns, ...columns];
};

// Helper function to convert Antd sort info to SigNoz API format
export const convertSorterToOrderBy = (
  sorter: any,
  currentOrderBy?: Array<{ key: { name: string }, direction: string }>
): Array<{ key: { name: string }, direction: string }> => {
  // If no sorter or sorter is not active, return current orderBy or empty array
  if (!sorter || !sorter.order || !sorter.field) {
    return currentOrderBy || [];
  }

  const newOrderItem = {
    key: { name: sorter.field === 'date' ? 'timestamp' : sorter.field },
    direction: sorter.order === 'ascend' ? 'asc' : 'desc'
  };

  // For single column sorting, replace entire orderBy array
  // This matches the requirement from the previous PR discussions
  return [newOrderItem];
};

// Type definitions for better TypeScript support
export interface QueryDataV3 {
  list: Array<{
    data: any;
    timestamp: number;
  }>;
}

export interface SorterResult {
  column?: any;
  order?: 'ascend' | 'descend';
  field?: string;
  columnKey?: string;
}

export interface OrderByItem {
  key: { name: string };
  direction: 'asc' | 'desc';
}
