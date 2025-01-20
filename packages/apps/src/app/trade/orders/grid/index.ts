import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { when } from 'lit/directives/when.js';

import { ColumnDef, Row } from '@tanstack/table-core';

import { OrdersDatagrid } from '../OrdersDatagrid';
import { Order, PLACEHOLDER } from '../types';

import './transactions';

@customElement('gc-orders-grid')
export class OrdersGrid extends OrdersDatagrid {
  static styles = [OrdersDatagrid.styles];

  constructor() {
    super();
    this.onRowClick = (row: Row<Order>) => {
      row.toggleSelected();
      const options = {
        bubbles: true,
        composed: true,
        detail: { id: row.original.id },
      };
      this.dispatchEvent(new CustomEvent('order-click', options));
    };
  }

  private actionsRowTemplate(row: Row<Order>) {
    const classes = {
      expanded: row.getIsSelected(),
    };
    return html`
      <uigc-icon-dropdown class=${classMap(classes)}></uigc-icon-dropdown>
    `;
  }

  protected defaultColumns(): ColumnDef<Order>[] {
    return [
      {
        id: 'pair',
        header: () => 'Pay with / Get',
        cell: ({ row }) => this.pairTemplate(row.original),
      },
      {
        id: 'interval',
        header: () => 'Interval (blocks)',
        accessorKey: 'interval',
      },
      {
        id: 'amount',
        header: () => 'Amount',
        cell: ({ row }) => this.getAmount(row.original),
      },
      {
        id: 'status',
        header: () => 'Status',
        cell: ({ row }) => this.statusTemplate(row.original),
      },
      {
        id: 'actions',
        cell: ({ row }) => this.actionsRowTemplate(row),
      },
    ];
  }

  protected expandedRowTemplate(row: Row<Order>): TemplateResult {
    let tx = row.original.transactions;
    if (row.original.hasPendingTx()) {
      tx = [PLACEHOLDER].concat(tx);
    }
    return html`
      <div class="row">
        ${this.summaryTemplate(row.original)}
        <div class="transactions">Past transactions</div>
        <gc-orders-grid-tx
          .order=${row.original}
          .defaultData=${tx.slice(0, 10)}></gc-orders-grid-tx>
      </div>
    `;
  }

  render() {
    return html`
      <slot name="header"></slot>
      <slot name="tabs"></slot>
      ${super.render()}
      ${when(
        this.defaultData.length === 0,
        () =>
          html`
            <slot name="empty"></slot>
          `,
      )}
    `;
  }
}
