import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDisconnectButton, WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

import background from "./images/banner.png"

const ConnectButton = styled(WalletDialogButton)``;

const DisconnectButton = styled(WalletDisconnectButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);
  
  return (
    <main>
      <div className="navbar">
        <div className="col px-2">
          <h1>Scratch A.I.</h1>
        </div>
        <div className="d-flex flex-wrap justify-content-center">
          <a className="nav-link" href="#About">About</a>
          <a className="nav-link" href="#Roadmap">Roadmap</a>
          <a className="nav-link" href="#">Utility</a>
          <a className="nav-link" href="#">Team</a>
          {!wallet && (<ConnectButton>Connect Wallet</ConnectButton>)}
          {wallet && (<DisconnectButton>Log Out</DisconnectButton>)}
        </div>
      </div>
      <div className="row row-cols-sm-1 row-cols-md-2 p-2 m-0" style={{ backgroundImage: `url(${background})`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }}>
        <div className="jumbotron">
          <br/>
          <h3 className="display-4">Organic Growth</h3>
          <h3 className="display-4">Long Term</h3>
          <h3 className="display-4">Not Just Hype</h3>
          <hr className="my-4"/>
          <p>Algorithmic, A.I. & NFT based multiasset Investment Fund... built from scratch :]</p>
          <br/>
        </div>
        <div className="d-flex flex-column align-items-center px-5">
          <br/>
          <br/>
          <div className="d-flex flex-wrap justify-content-center">
            <h5>Mint a Scratch</h5>
          </div>
          <div className="d-flex flex-wrap justify-content-center">
            <p className="fs-6-light">Minting will give you the perks of a Scratch Partner, the fee to help this going from scratch to hatch is 3 SOL.</p>
          </div>
          <div className="d-flex flex-wrap justify-content-center">
            <MintContainer>
              <div className="d-flex flex-wrap justify-content-center px-5">
                {wallet && <p> Wallet: {shortenAddress(wallet.publicKey.toBase58() || "")}</p>}
                {wallet && <p className="px-2">  | </p>}
                {wallet && <p> Balance: {(balance || 0).toLocaleString()} SOL </p>}
              </div>
              <div className="d-flex flex-wrap justify-content-center">
                {wallet && <p className="px-2">Total Cavienant: {itemsAvailable}</p>}
                {wallet && <p className="px-2">Released: {itemsRedeemed}</p>}
                {wallet && <p className="px-2">Awaiting: {itemsRemaining}</p>}
              </div>
              <div className="d-flex flex-wrap justify-content-center">
                <Button style ={{padding: "0px"}}
                  disabled={isSoldOut || isMinting || !isActive}
                  onClick={onMint}
                  variant="contained"
                  >                  
                  {isSoldOut ? <p className="p-2 m-0">SOLD OUT</p> : (isActive && (isMinting ? (<CircularProgress />) : (wallet ? <p className="p-2 m-0">RELEASE 1</p> : (<ConnectButton>Connect Wallet</ConnectButton>))))}
                  <Countdown date={1632615120 * 1000}
                      onMount={({ completed }) => completed && setIsActive(true)}
                      onComplete={() => setIsActive(true)}
                      renderer={renderCounter}
                      />
                </Button>
              </div>
            </MintContainer>
            <Snackbar
              open={alertState.open}
              autoHideDuration={6000}
              onClose={() => setAlertState({ ...alertState, open: false })}
              >
              <Alert
                onClose={() => setAlertState({ ...alertState, open: false })}
                severity={alertState.severity}
                >
                {alertState.message}
              </Alert>
            </Snackbar>
          </div>
          <div className="d-flex flex-wrap justify-content-center"> 
            <p className="text-center"><small>You can release up to 9999 of 9999, but do it one at a time or The Cuymmandant's escape plan won't succeed and a possible Cavinant will fall in the attempt.</small></p>
          </div>
        </div>
      </div>
      <div className="col px-5">
        <h3 id="About">Welcome to Cavyland</h3>
        <p>The Cavinants are the Guinea Pigs who escaped from captivity and are building the raising Cavyland.</p>
      </div>
      <div className="col px-5">
        <h2>Rarity</h2>
        <p>All the Cavinants are equal but nature gave them different attributes and personalities, making some cavys more ostentatious than others.</p>
      </div>
      <div className="col px-5">
        <h2 id="Roadmap">Utility & Roadmap</h2>
        <p>Holding one or more Cavinants grants you access to many perks</p>
        <p>What we have and what we want</p>
        <ul>
          <li><p>Hold to EARN</p><p>50% of all royalties from trading fees will be sent back to holders on a weekly basis.</p></li>
          <li><p>Hold to VOTE</p><p>25% of all royalties from trading fees will be sent to a mutual wallet. Yeti’s holders will be able to vote to choose how to spend those funds.</p></li>
        </ul>
      </div>
      <div className="col px-5">
        <h2>FAQ's</h2>
        <div id="accordion">
          <div className="card">
            <div className="card-header" id="headingOne">
              <h5 className="mb-0">
                <button className="btn btn-link" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                  Collapsible Group Item #1
                </button>
              </h5>
            </div>
            <div id="collapseOne" className="collapse show" aria-labelledby="headingOne" data-parent="#accordion">
              <div className="card-body">
                Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute, non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod. Brunch 3 wolf moon tempor, sunt aliqua put a bird on it squid single-origin coffee nulla assumenda shoreditch et. Nihil anim keffiyeh helvetica, craft beer labore wes anderson cred nesciunt sapiente ea proident. Ad vegan excepteur butcher vice lomo. Leggings occaecat craft beer farm-to-table, raw denim aesthetic synth nesciunt you probably haven't heard of them accusamus labore sustainable VHS.
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header" id="headingTwo">
              <h5 className="mb-0">
                <button className="btn btn-link collapsed" data-toggle="collapse" data-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                  Collapsible Group Item #2
                </button>
              </h5>
            </div>
            <div id="collapseTwo" className="collapse" aria-labelledby="headingTwo" data-parent="#accordion">
              <div className="card-body">
                Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute, non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod. Brunch 3 wolf moon tempor, sunt aliqua put a bird on it squid single-origin coffee nulla assumenda shoreditch et. Nihil anim keffiyeh helvetica, craft beer labore wes anderson cred nesciunt sapiente ea proident. Ad vegan excepteur butcher vice lomo. Leggings occaecat craft beer farm-to-table, raw denim aesthetic synth nesciunt you probably haven't heard of them accusamus labore sustainable VHS.
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header" id="headingThree">
              <h5 className="mb-0">
                <button className="btn btn-link collapsed" data-toggle="collapse" data-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                  Collapsible Group Item #3
                </button>
              </h5>
            </div>
            <div id="collapseThree" className="collapse" aria-labelledby="headingThree" data-parent="#accordion">
              <div className="card-body">
                Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute, non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod. Brunch 3 wolf moon tempor, sunt aliqua put a bird on it squid single-origin coffee nulla assumenda shoreditch et. Nihil anim keffiyeh helvetica, craft beer labore wes anderson cred nesciunt sapiente ea proident. Ad vegan excepteur butcher vice lomo. Leggings occaecat craft beer farm-to-table, raw denim aesthetic synth nesciunt you probably haven't heard of them accusamus labore sustainable VHS.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col px-5">
        <h2>Team</h2>
      </div>
      <div className="col px-5">
        <p>Footer</p>
      </div>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  if (completed) {
    // Render a completed state
    return <div></div>;
  } else {
    return (
      <CounterText>
        <p className="p-3 m -0">Escape starts in {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds</p>
      </CounterText>
    );
  };
};

export default Home;
