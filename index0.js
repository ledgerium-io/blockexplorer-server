import React, { Component, Fragment } from "react";
import { Row, Card, CardBody, CardTitle, Button, Jumbotron,   DropdownMenu,
  DropdownToggle,   ModalHeader,Modal,
    ModalBody, Table,
    ModalFooter,
  DropdownItem, UncontrolledDropdown, TabPane, TabContent, Nav, NavItem, NavLink} from "reactstrap";

import MUIDataTable from "mui-datatables";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TradingChart from "Components/TradingChart"

import 'Assets/css/format.css';
import io from 'socket.io-client';
import axios from 'axios'
import moment from 'moment'
import { Sparklines, SparklinesLine } from 'react-sparklines';




export default class BinanceTableBTC extends Component {

  constructor(props) {
    super(props)
    this.state = {
      ready: false,
      selectedCoin: "",
      tradeVolumes: 0,
      rowsPerPageOptions: [5, 10, 20, 30, 50, 100],
      selectedPageSize: 10,
      coinInfo: {
        symbol: ""
      },
      coinInfo2: {
        symbol: ""
      },
      modal: false,
      show: {
        reference: true,
        facts: true,
        favourite: false,
        symbol: true,
        last: true,
        volume: true,
        high: false,
        low: false,
        high24h: false,
        low24h: false,
        price24h: true,
        price4h: false,
        price60m: true,
        price30m: true,
        price15m: true,
        price5m: true,
        volume24h: true,
        volume4h: false,
        volume60m: true,
        volume30m: true,
        volume15m: true,
        volume5m: true,
        buyers: true,
        sellers: false,
        chart: true,
      }

    }
  }

  toggle = () => {
    this.setState({
      modal: !this.state.modal
    });
  }

  setSelectedCoin = (selectedCoin) => {
    axios.get(`http://localhost:1337/api/ticker/all/${selectedCoin.toLowerCase()}`)
      .then(response => {
        console.log(response.data)
        if(!response.data.success) return;
        const coinInfo = response.data.data
        const coinInfo2 = response.data.data2
        this.setState({coinInfo, coinInfo2, modal: true})
      })
  }

  formatStat(stat) {
    if(stat > 0) {
      return <span className="changeUp"><i className="fa fa-arrow-up" aria-hidden="true"></i> {stat}%</span>
    }
    if(stat < 0) {
      return <span className="changeDown"><i className="fa fa-arrow-down" aria-hidden="true"></i>{stat}%</span>
    }
    return <span className="nochange"><i className="fa fa-minus" aria-hidden="true"></i> 0%</span>

  }

  componentWillMount() {
    axios.get('http://localhost:1337/api/binance/stats/btc', {
      headers: {
        token: localStorage.getItem('token')
      }
    })
    .then(response => {
      if(response.data.success) {
        const tradeVolumes = response.data.tradeVolumes
        let coins = response.data.data
        const keys = Object.keys(coins)
        let data = []
        for(let i=0; i<keys.length; i++) {
          if(coins[keys[i]].v == 0) continue;
          if(coins[keys[i]].s == "BCHSVBTC") continue;
          if(coins[keys[i]].s == "PHXBTC") continue;
          if(coins[keys[i]].S == "BCHABC") {
            coins[keys[i]].S = "BCH"
          }
          data.push({
            reference: coins[keys[i]].s,
            facts: coins[keys[i]].S,
            favourite: coins[keys[i]].s,
            symbol: coins[keys[i]].S,
            last: coins[keys[i]].l,
            volume: coins[keys[i]].v,
            high: coins[keys[i]].H,
            low: coins[keys[i]].L,
            high24h: +coins[keys[i]].h24,
            low24h: +coins[keys[i]].l24,
            price24h: +coins[keys[i]].p24,
            price4h: +coins[keys[i]].p4,
            price60m: +coins[keys[i]].p60,
            price30m: +coins[keys[i]].p30,
            price15m: +coins[keys[i]].p15,
            price5m: +coins[keys[i]].p5,
            volume24h: +coins[keys[i]].v24,
            volume4h: +coins[keys[i]].v4,
            volume60m: +coins[keys[i]].v60,
            volume30m: +coins[keys[i]].v30,
            volume15m: +coins[keys[i]].v15,
            volume5m: +coins[keys[i]].v5,
            sellers: +coins[keys[i]].sell,
            buyers: +coins[keys[i]].buy

          })
        }
        this.setState({
          ready: true,
          tradeVolumes,
          data,
        })
      }
    })
    .catch(error => {
      console.log(error)
    })
  }

  serverSocket() {
    const self = this
    const socket = io('http://localhost:1337');
    socket.on('connect', () => {
      self.setState({
        connected: true
      })
    });

    socket.on('disconnect', () => {
        self.setState({
          connected: false
        })
    })
    // socket.on('binanceUpdate', (message) => {
    //   for(let i=0; i<message.length; i++) {
    //     if(message[i].e != '24hrTicker') return
    //     if(message[i].s.slice(-3) == 'BTC') {
    //       try {
    //         const oldLast = +document.getElementById(`${message[i].s}c`).innerHTML
    //         const newLast = message[i].c
    //         document.getElementById(`${message[i].s}c`).innerHTML = newLast
    //         document.getElementById(`${message[i].s}c`).className = self.upOrDown(oldLast, newLast)
    //         const oldVolume = +document.getElementById(`${message[i].s}v`).innerHTML
    //         const newVolume = +message.q.toFixed()
    //         document.getElementById(`${message[i].s}v`).innerHTML = newVolume
    //         document.getElementById(`${message[i].s}v`).className = self.upOrDown(oldVolume, newVolume)
    //
    //         document.getElementById(`${message[i].s}pC`).innerHTML = message[i].P.toFixed(2)
    //
    //       } catch(error) {
    //       }
    //
    //     }
    //   }
    // })

    socket.on('binanceTradeVolume', (response) => {
      self.setState({
        tradeVolumes: response
      })
    })

    socket.on('binanceStatUpdate', (response) => {
      self.setState({
        lastUpdate: 0
      })
      let coins = response
      const keys = Object.keys(coins)
      let data = []
      for(let i=0; i<keys.length; i++) {
        if(coins[keys[i]].v == 0) continue;
        if(coins[keys[i]].s == "BCHSVBTC") continue;
        if(coins[keys[i]].s == "BCHABCBTC") {
          coins[keys[i]].s = "BCHBTC"
        }
        data.push({
          reference: coins[keys[i]].s,
          facts: coins[keys[i]].S,
          favourite: coins[keys[i]].s,
          symbol: coins[keys[i]].S,
          last: coins[keys[i]].l,
          volume: coins[keys[i]].v,
          high: coins[keys[i]].H,
          low: coins[keys[i]].L,
          high24h: +coins[keys[i]].h24,
          low24h: +coins[keys[i]].l24,
          price24h: +coins[keys[i]].p24,
          price4h: +coins[keys[i]].p4,
          price60m: +coins[keys[i]].p60,
          price30m: +coins[keys[i]].p30,
          price15m: +coins[keys[i]].p15,
          price5m: +coins[keys[i]].p5,
          volume24h: +coins[keys[i]].v24,
          volume4h: +coins[keys[i]].v4,
          volume60m: +coins[keys[i]].v60,
          volume30m: +coins[keys[i]].v30,
          volume15m: +coins[keys[i]].v15,
          volume5m: +coins[keys[i]].v5,
          sellers: +coins[keys[i]].sell,
          buyers: +coins[keys[i]].buy
        })
      }
      self.setState({
        ready: true,
        data
      })
    })

  }

  render() {
    const options = {
        rowsPerPageOptions: this.state.rowsPerPageOptions,
          selectableRows: false,
          expandableRows: true,
          renderExpandableRow: (rowData, rowMeta) => {
            const colSpan = rowData.length + 1;
            console.log(rowData)
            return (
              <TableRow>
                <TableCell colSpan={colSpan} >

                </TableCell>
              </TableRow>
            )
      }
    }
    const columns = [
     {
      name: "reference",
      label: "#",
      options: {
         filter: true,
         sort: false,
         display: this.state.show.reference
         ,
         customBodyRender: (value, tableMeta) => {
              return(<span>{tableMeta.rowIndex+1}</span>)
         }
      }
    },
    {
     name: "facts",
     label: "Facts",
     options: {
        filter: true,
        sort: false,
        display: this.state.show.facts,
        customBodyRender: (value, tableMeta) => {
          return(<span onClick={()=>{this.setSelectedCoin(value)}}><i className="fas fa-info"/></span>)
        }
     }
    },
    {
    name: "favourite",
    options: {
       filter: true,
       sort: true,
       display: this.state.show.favourite,
       customBodyRender: () => {
         return(<i className="simple-icon-star"></i>)
       }
       ,
       customHeadRender: (index, ...column) => {
         return(<TableCell key={index}>
               <i className="simple-icon-star"></i>
             </TableCell>)
       }

    }
    },
    {
    name: "symbol",
    label: "Symbol",
    options: {
      filter: true,
      sort: false,
      display: this.state.show.symbol,
      customBodyRender: (value) => {
              return(<span><img height={"50%"} src={`https://cryptostat.org/home/images/${value.toLowerCase()}.png`} /> {value} <small><a target="_blank" href={`https://www.binance.com/en/trade/${value}_BTC`}><i className="simple-icon-login"></i></a></small></span>)
      }

    }
    },

    {
    name: "last",
    label: "Last",
    options: {
     filter: true,
     sort: true,
     display: this.state.show.last
    }
    },
    {
    name: "volume",
    label: "Volume",
    options: {
    filter: true,
    sort: true,
    sortDirection: 'desc',
    display: this.state.show.volume,
    customBodyRender: (value) => {
            return(<span>{value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>)
    }
    }
    },
    {
    name: "price24h",
    label: "Price Change 24h",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price24h,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "price4h",
    label: "Price Change 4h",
    options: {
     filter: true,
     sort: true,
     display: this.state.show.price4h,
     customBodyRender: (value) => {
             return(<span>{this.formatStat(value)}</span>)
     }
    }
    },
    {
    name: "price60m",
    label: "Price Change 60m",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price60m,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "price30m",
    label: "Price Change 30m",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price30m,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "price15m",
    label: "Price Change 15m",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price15m,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "price5m",
    label: "Price Change 5m",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price5m,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "volume24h",
    label: "Volume Change 24h",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price24h,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "volume4h",
    label: "Volume Change 4h",
    options: {
     filter: true,
     sort: true,
     display: this.state.show.price4h,
     customBodyRender: (value) => {
             return(<span>{this.formatStat(value)}</span>)
     }
    }
    },
    {
    name: "volume60m",
    label: "Volume Change 60m",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price60m,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "volume30m",
    label: "Volume Change 30m",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price30m,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "volume15m",
    label: "Volume Change 15m",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price15m,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "volume5m",
    label: "Volume Change 5m",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.price5m,
    customBodyRender: (value) => {
            return(<span>{this.formatStat(value)}</span>)
    }
    }
    },
    {
    name: "sellers",
    label: "Sellers",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.sellers,
    customBodyRender: (value) => {
            return(<span>{value}%</span>)
    }
    }
    },
    {
    name: "buyers",
    label: "Buyers",
    options: {
    filter: true,
    sort: true,
    display: this.state.show.buyers,
    customBodyRender: (value) => {
            return(<span>{value}%</span>)
    }
    }
    },
    ]
    const {data, coinInfo, coinInfo2} = this.state;
    return(
      <Fragment>
      {coinInfo.symbol !== "" ?
                <Modal isOpen={this.state.modal} toggle={this.toggle} wrapClassName="modal-right">
                  <ModalHeader toggle={this.toggle}><img height="50px" src={coinInfo.image}/> {coinInfo.name} ({coinInfo.symbol.toUpperCase()})</ModalHeader>
                  <ModalBody>
                  <Table>
                    <tbody>
                      <tr>
                        <th>Price</th>
                        <td>${coinInfo.current_price.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <th></th>
                        <td>{coinInfo2.current_price}</td>
                      </tr>
                      <tr>
                        <th>Market Cap</th>
                        <td>${coinInfo.market_cap.toLocaleString({maximumFractionDigits: 0})}</td>
                      </tr>
                      <tr>
                        <th>Rank</th>
                        <td>{coinInfo.market_cap_rank}</td>
                      </tr>
                      <tr>
                        <th>Total Volume</th>
                        <td>${coinInfo.total_volume.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <th>Circulating Supply</th>
                        <td>{coinInfo.circulating_supply.toLocaleString({maximumFractionDigits: 0})}</td>
                      </tr>
                      <tr>
                        <th>Total Supply</th>
                        <td>{coinInfo.total_supply == null ? "-" : coinInfo.total_supply.toLocaleString({maximumFractionDigits: 0}) }</td>
                      </tr>
                      <tr>
                        <th>ATH Price</th>
                        <td>${coinInfo.ath}</td>
                      </tr>
                      <tr>
                        <th></th>
                        <td>{coinInfo2.ath}</td>
                      </tr>
                      <tr>
                        <th>ATH Change</th>
                        <td>{coinInfo.ath_change_percentage.toLocaleString()}%</td>
                      </tr>
                      <tr>
                        <th></th>
                        <td>{coinInfo2.ath_change_percentage.toLocaleString()}%</td>
                      </tr>
                      <tr>
                        <th>ATH Date</th>
                        <td>{moment(coinInfo.ath_date).format('LLL')}</td>
                      </tr>
                      <tr>
                        <th></th>
                        <td>{moment(coinInfo2.ath_date).format('LLL')}</td>
                      </tr>
                    </tbody>
                  </Table>

                  <h3> Last 7 days</h3>
                  <br/>
                  <Sparklines data={coinInfo.sparkline_in_7d.price}>
                    <SparklinesLine style={{ strokeWidth: 2, stroke: coinInfo.sparkline_in_7d.price[0] > coinInfo.sparkline_in_7d.price[coinInfo.sparkline_in_7d.price.length-1] ? "#b94a48" : "#468847", fill: "none" }} />
                </Sparklines>
                  <br/>
                  </ModalBody>
                  <ModalFooter>
                    <Button color="secondary" onClick={this.toggle}>
                      Close
                    </Button>
                  </ModalFooter>
                </Modal>
        : null
      }
        <MUIDataTable
          title={<div><i className="glyph-icon iconsminds-bar-chart-4"></i>Total Trading Volume: {this.state.tradeVolumes.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>}
          data={data}
          columns={columns}
          options={options}
        />
      </Fragment>
    )
  }

}
