import React, { useEffect, useState } from "react";
import './styles/App.css';
import { ethers } from "ethers";
import myEpicNft from './utils/MyEpicNFT.json';
import axios from 'axios';
import Loader, { Audio, BallTriangle, ThreeDots } from 'react-loader-spinner';

const TOTAL_MINT_COUNT = 50;

const CONTRACT_ADDRESS = "0xB54FC35B70965ba4D3a55172b4f29D7D720F7279";

const App = () => {

  const [currentAccount, setCurrentAccount] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNetworkRinkeby, setIsNetworkRinkeby] = useState(false);
  const [mintedNFT, setMintedNFT] = useState("");
  const [nftTokenId, setNFTTokenId] = useState(null);
  const [waitingForNFTLink, setWaitingForNFTLink] = useState(false);

  const checkNetwork = async () => {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if(chainId=='0x4'){
      setIsNetworkRinkeby(true);
    }
    else {
      setIsNetworkRinkeby(false);
    }
    return chainId;
  }

  const checkIfNetworkIsRinkeby = async () => {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log("Chain Id:",chainId);
    if(chainId!="0x4"){
      console.log("Network is not Rinkeby");
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [ {chainId: '0x4'} ]
        });
        setIsNetworkRinkeby(true);
      } catch (switchError) {
        if(switchError.code===4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{ chainId: '0x4', chainName: 'Rinkeby', rpcUrls: ['https://rinkeby.arbitrum.io/rpc'] }]
            });
          } catch(error) {
            console.error(error);
          }
        } else if(switchError.code===-32002){
          console.error("Request Already pending");
        }
      }
    } else {
      setIsNetworkRinkeby(true);
    }
  }

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have metamask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }

    const accounts = await ethereum.request({ method: 'eth_accounts' });

    if (accounts.length !== 0) {
          const account = accounts[0];
          console.log("Found an authorized account:", account);
          setCurrentAccount(account);
          setupEventListener();
    } 
    else {
          console.log("No authorized account found")
    }
  }

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
      setupEventListener();
    } catch (error) {
      console.log(error)
    }
  }

  const setupEventListener = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

        window.ethereum.on('accountsChanged', (accounts) => {
          console.log(accounts);
          if(accounts.length==0) {
            setCurrentAccount("");
          }
          else {
            setCurrentAccount(accounts[0]);
          }
        })

        window.ethereum.on('chainChanged', (chainId) => {
          if(chainId=='0x4'){
            setIsNetworkRinkeby(true);
          }
          else {
            setIsNetworkRinkeby(false);
          }
        })

        connectedContract.on("NewEpicNFTMinted", (from, tokenId) => {
          // alert("NFT Minted", "https://rinkeby.rarible.com/token/"+CONTRACT_ADDRESS+":"+tokenId.toNumber());
          console.log("From: ", from);
          console.log("Type of from: ", typeof from);
          // console.log("From: ", currentAccount);
          // console.log("Type of from: ", typeof currentAccount);
          setNFTTokenId(tokenId);
          settingMintedNFTLink(from, tokenId);
        });

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const settingMintedNFTLink = async (from, tokenId) => {
    setNFTTokenId(tokenId);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    var lowerCaseFrom = from.toLowerCase();
    var lowerCaseAccount = accounts[0].toLowerCase();
    if(lowerCaseFrom===lowerCaseAccount || lowerCaseFrom==lowerCaseAccount) {
      setMintedNFT("https://rinkeby.rarible.com/token/"+CONTRACT_ADDRESS+":"+tokenId);
      setWaitingForNFTLink(false);
    }
  }

  const askContractToMintNft = async () => {
    try{
      setLoading(true);
      const nftUrl = await postImageToImgbb();
      console.log({name});
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

        console.log("Going to pop wallet now to pay gas...");
        let nftTxn = await connectedContract.createNFT(name, description, nftUrl);

        console.log("Mining...Please wait");
        await nftTxn.wait();

        console.log(`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
      } else{
        console.log("Ethereum object doesn't exist!");
      }
      setLoading(false);
      setWaitingForNFTLink(true);
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  }

  const postImageToImgbb = async () => {
    var img = document.getElementById("input_img").files[0];
    let body = new FormData();
    body.set('key', '1e88c455402a4212ad40aaf1aa746490');
    body.append('image', img);

    const resp = await axios({
      method: 'post',
      url: 'https://api.imgbb.com/1/upload',
      data: body
    });
    
    return resp['data']['data']['url'];
  }

  const shortenAddress = () => {
    var startAdd = currentAccount.slice(0,5);
    var endAdd = currentAccount.slice(-4);
    return startAdd+"..."+endAdd;
  }

  const TopBar = () => {
  return (
    <div className="topBarBackground">
      <div className="topBar">
        <div className="projectName"><h2>NFT Minter</h2></div>
        <div className="rightBar">
          {currentAccount===""?
          (
          <div className="gradientBorderBtnContainer">
            <span><button className="connectBtn" onClick={connectWallet}>Connect Wallet</button></span>
          </div>
          ):
          (<div className="connectedWalletContainer">
            <div>
              <span>{shortenAddress()}</span>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  )
  }

  const SwitchNetworkCard = () => {
    return (
      <div className="cardContainer">
        <div className="card">
          <div><span><h2>Switch to Rinkeby Test Network</h2></span></div>
          <div className="contentContainer"><span>
            Yess! You are one of the first few to  discover us.<br />
            This project is currently only supported on test network only.
          </span></div>
          <div className="switchNetworkContainer">
            <span className="switchNetworkNote">Note: You will see 1 promt on clicking the button.</span>
            <button className="switchNetworkBtn" onClick={checkIfNetworkIsRinkeby}>Switch Network</button>
          </div>
        </div>
      </div>
    )
  }

  const goToRarible = () => {
    if(mintedNFT!==""){
      window.open(mintedNFT,"_blank");
    }
  }

  const MintingNFTCard = () => {
    return (
      <div className="cardContainer">
        <div className="card">
          <div><span>{(loading || waitingForNFTLink)? (<h2>Your NFT is being minted</h2>) : (<h2>Your NFT is minted</h2>)}</span></div>
          <div>{(loading || waitingForNFTLink)? (<span>This might take few moments, please be patient with us.</span>) : (
            <div className="mintNFTMessageContainer">
              <span>Yessss!!</span>
              <span>Your NFT is now minted. Go check it out!</span>
            </div>
            )}
          </div>
          <div className="loader">
            {(loading || waitingForNFTLink) && <ThreeDots type="ThreeDots" color="#888888" height={80} width={80} />}
          </div>
          <div><button className="checkNftBtn" onClick={goToRarible} disabled={loading || waitingForNFTLink}>Check your NFT</button></div>
        </div>
      </div>
    )
  }


  useEffect(() => {
    checkIfWalletIsConnected();
    checkNetwork();
  }, [])


  return (
    <div className="App">
      <TopBar />
        <div className="header-container">
        {isNetworkRinkeby && !(loading || mintedNFT!=="" || waitingForNFTLink)? (
          <div className="backgroundContainer" style={{zIndex:"-1"}}></div>
        ):
        (
          <div className="backgroundContainer" style={{backdropFilter: "blur(15px)"}}></div>
        )}
          <div className="card">
      <div><h1>Mint Your NFT in Few Clicks</h1></div>
      <div className="inputContainer">
        <div className="inputFlexContainer">
          <span><label for="name">Name of your NFT</label></span>
          <input type="text" name="name" placeholder="Give a Name to your NFT" size="50" maxLength="50" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="wordCount"></div>
        </div>
      </div>
      <div className="inputContainer">
        <div className="inputFlexContainer">
          <span><label for="description">Describe your NFT</label></span>
          <input type="text" name="description" placeholder="Give a brief description of your NFT" onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="inputContainer">
        <div className="inputFlexContainer">
          <span><label for="nftImage">Upload your NFT</label></span>
          <div className="inputFileContainer"><input type="file" id="input_img" accept="image/*" /></div>
        </div>
      </div>
      <div className="mintingContainer">
        <div className="mintBtnContainer">
          {(isNetworkRinkeby===false || currentAccount==="") ? 
            (<button className="mintBtn" onClick={askContractToMintNft} disabled>MINT NFT</button>):
            (<div className="gradientBorderBtnContainer">
              <button className="mintBtn" onClick={askContractToMintNft}>MINT NFT</button>
            </div>
            )}
        </div>
        <div className="faucetLinkContainer">
          <span><a href="https://buildspace-faucet.vercel.app/" target="_blank">Get ETH for minting</a></span>
        </div>
      </div>
    </div>
          {!isNetworkRinkeby &&
            <SwitchNetworkCard />
          }
          {(loading || mintedNFT!=="" || waitingForNFTLink) && 
            <MintingNFTCard />
          }
        </div>
      </div>
  );
};

export default App;
