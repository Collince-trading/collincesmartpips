export type SmartPipsBotTemplate = 'alpha-over-under' | 'bot11-even-odd' | 'scanner-matches-differs';

const templates: Record<SmartPipsBotTemplate, { name: string; xml: string }> = {
    'alpha-over-under': {
        name: 'Alpha Version 2026 Edition',
        xml: `<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
  <block type="trade" id="alpha_trade" x="0" y="0">
    <statement name="SUBMARKET">
      <block type="market" id="alpha_market">
        <field name="MARKET_LIST">volidx</field><field name="SUBMARKET_LIST">random_index</field><field name="SYMBOL_LIST">R_100</field>
        <field name="TRADETYPECAT_LIST">digits</field><field name="TRADETYPE_LIST">overunder</field><field name="TYPE_LIST">both</field>
        <field name="CANDLEINTERVAL_LIST">60</field><field name="DURATIONTYPE_LIST">t</field><field name="PAYOUTTYPE_LIST">stake</field><field name="CURRENCY_LIST">USD</field><field name="RESTARTONERROR">FALSE</field>
        <value name="DURATION"><block type="math_number"><field name="NUM">1</field></block></value>
        <value name="AMOUNT"><block type="math_number"><field name="NUM">0.35</field></block></value>
        <value name="PREDICTION"><block type="math_number"><field name="NUM">5</field></block></value>
      </block>
    </statement>
  </block>
  <block type="before_purchase" id="alpha_before" x="0" y="250">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="controls_if" id="alpha_condition">
        <mutation else="1"></mutation>
        <value name="IF0"><block type="logic_compare"><field name="OP">GT</field><value name="A"><block type="last_digit"></block></value><value name="B"><block type="math_number"><field name="NUM">5</field></block></value></block></value>
        <statement name="DO0"><block type="purchase"><field name="PURCHASE_LIST">DIGITOVER</field></block></statement>
        <statement name="ELSE"><block type="purchase"><field name="PURCHASE_LIST">DIGITUNDER</field></block></statement>
      </block>
    </statement>
  </block>
  <block type="after_purchase" id="alpha_after" x="0" y="430"><statement name="AFTERPURCHASE_STACK"><block type="trade_again"></block></statement></block>
</xml>`
    },
    'bot11-even-odd': {
        name: 'SMARTPIPS BOT11',
        xml: `<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
  <block type="trade" id="bot11_trade" x="0" y="0">
    <statement name="SUBMARKET">
      <block type="variables_set" id="bot11_init">
        <field name="VAR">Contract Type</field><value name="VALUE"><block type="text"><field name="TEXT">Even</field></block></value>
        <next><block type="market" id="bot11_market">
          <field name="MARKET_LIST">volidx</field><field name="SUBMARKET_LIST">random_index</field><field name="SYMBOL_LIST">R_100</field>
          <field name="TRADETYPECAT_LIST">digits</field><field name="TRADETYPE_LIST">evenodd</field><field name="TYPE_LIST">both</field>
          <field name="CANDLEINTERVAL_LIST">60</field><field name="DURATIONTYPE_LIST">t</field><field name="PAYOUTTYPE_LIST">stake</field><field name="CURRENCY_LIST">USD</field><field name="RESTARTONERROR">FALSE</field>
          <value name="DURATION"><block type="math_number"><field name="NUM">1</field></block></value>
          <value name="AMOUNT"><block type="math_number"><field name="NUM">0.35</field></block></value>
        </block></next>
      </block>
    </statement>
  </block>
  <block type="before_purchase" id="bot11_before" x="0" y="250"><statement name="BEFOREPURCHASE_STACK"><block type="controls_if" id="bot11_condition"><mutation else="1"></mutation>
    <value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="variables_get"><field name="VAR">Contract Type</field></block></value><value name="B"><block type="text"><field name="TEXT">Even</field></block></value></block></value>
    <statement name="DO0"><block type="purchase"><field name="PURCHASE_LIST">DIGITEVEN</field></block></statement>
    <statement name="ELSE"><block type="purchase"><field name="PURCHASE_LIST">DIGITODD</field></block></statement>
  </block></statement></block>
  <block type="after_purchase" id="bot11_after" x="0" y="430"><statement name="AFTERPURCHASE_STACK"><block type="controls_if" id="bot11_toggle"><mutation else="1"></mutation>
    <value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="variables_get"><field name="VAR">Contract Type</field></block></value><value name="B"><block type="text"><field name="TEXT">Even</field></block></value></block></value>
    <statement name="DO0"><block type="variables_set"><field name="VAR">Contract Type</field><value name="VALUE"><block type="text"><field name="TEXT">Odd</field></block></value></block></statement>
    <statement name="ELSE"><block type="variables_set"><field name="VAR">Contract Type</field><value name="VALUE"><block type="text"><field name="TEXT">Even</field></block></value></block></statement>
    <next><block type="trade_again"></block></next>
  </block></statement></block>
</xml>`
    },
    'scanner-matches-differs': {
        name: 'AI SIGNAL SCANNER',
        xml: `<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
  <block type="trade" id="scanner_trade" x="0" y="0">
    <statement name="SUBMARKET">
      <block type="market" id="scanner_market">
        <field name="MARKET_LIST">volidx</field><field name="SUBMARKET_LIST">random_index</field><field name="SYMBOL_LIST">R_100</field>
        <field name="TRADETYPECAT_LIST">digits</field><field name="TRADETYPE_LIST">matchesdiffers</field><field name="TYPE_LIST">both</field>
        <field name="CANDLEINTERVAL_LIST">60</field><field name="DURATIONTYPE_LIST">t</field><field name="PAYOUTTYPE_LIST">stake</field><field name="CURRENCY_LIST">USD</field><field name="RESTARTONERROR">FALSE</field>
        <value name="DURATION"><block type="math_number"><field name="NUM">1</field></block></value>
        <value name="AMOUNT"><block type="math_number"><field name="NUM">0.35</field></block></value>
        <value name="PREDICTION"><block type="math_number"><field name="NUM">7</field></block></value>
      </block>
    </statement>
  </block>
  <block type="before_purchase" id="scanner_before" x="0" y="250"><statement name="BEFOREPURCHASE_STACK"><block type="controls_if" id="scanner_condition"><mutation else="1"></mutation>
    <value name="IF0"><block type="logic_compare"><field name="OP">EQ</field><value name="A"><block type="last_digit"></block></value><value name="B"><block type="math_number"><field name="NUM">7</field></block></value></block></value>
    <statement name="DO0"><block type="purchase"><field name="PURCHASE_LIST">DIGITMATCH</field></block></statement>
    <statement name="ELSE"><block type="purchase"><field name="PURCHASE_LIST">DIGITDIFF</field></block></statement>
  </block></statement></block>
  <block type="after_purchase" id="scanner_after" x="0" y="430"><statement name="AFTERPURCHASE_STACK"><block type="trade_again"></block></statement></block>
</xml>`
    }
};

let pendingTemplate: SmartPipsBotTemplate | null = null;
export const queueSmartPipsBot = (key: SmartPipsBotTemplate) => { pendingTemplate = key; };
export const takeSmartPipsBot = () => {
    if (!pendingTemplate) return null;
    const selected = templates[pendingTemplate];
    pendingTemplate = null;
    return selected;
};
