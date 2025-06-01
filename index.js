import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';
import {clusterApiUrl, Connection, Keypair, PublicKey} from '@solana/web3.js';
import {encodeURL, findReference, validateTransfer} from '@solana/pay';
import BigNumber from 'bignumber.js';
import QRCode from 'qrcode';

const app = express();
const port = process.env.SERVER_PORT || 3000;

const network = process.env.NETWORK || 'devnet';
const walletAddress = process.env.WALLET_ADDRESS;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const connection = new Connection(clusterApiUrl(network), 'confirmed');

const MERCHANT_WALLET = new PublicKey(walletAddress);

app.post('/api/payment-qr', async (req, res) => {
    try {
        const amount = new BigNumber(req.body.amount);
        const reference = new Keypair().publicKey;
        const label = 'HHMShop Solana Payment';
        const message = req.body.message;

        const url = encodeURL({
            recipient: MERCHANT_WALLET,
            amount,
            reference, 
            label,
            message
        });

        const qrCode = await QRCode.toDataURL(url.toString());

        res.status(200).json({
            url: url.toString(),
            qrCode,
            reference
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Lỗi tạo yêu cầu thanh toán'});
    }
});

app.get('/api/check-payment/:reference', async (req, res) => {
    try {
        const reference = new PublicKey(req.params.reference);

        const signatureInfo = await findReference(connection, reference);

        await validateTransfer(connection, signatureInfo.signature, {
            recipient: MERCHANT_WALLET, 
            amount: null, 
            reference
        });

        res.status(200).json({
            status: 'success', 
            signature: signatureInfo.signature
        });
    } catch (error) {
        if (error.name === 'FindReferenceError') {
            res.status(200).json({status: 'pending'});
        } else {
            console.error(error);
            res.status(500).json({error: 'Lỗi kiểm tra thanh toán'});
        }
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
