// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch user profile and transactions
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setDataLoading(true);
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }

        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        let txns = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        txns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTransactions(txns);
        const total = txns.reduce((acc, t) => {
          return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);
        setBalance(total);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Add transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!description || !amount) {
      alert('Please fill in both fields.');
      return;
    }
    try {
      await addDoc(collection(db, 'transactions'), {
        description,
        amount: parseFloat(amount),
        type,
        createdAt: new Date().toISOString(),
        userId: user.uid,
      });
      setDescription('');
      setAmount('');
      setType('income');
      // Refresh transactions
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      let txns = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      txns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(txns);
      const total = txns.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
      }, 0);
      setBalance(total);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction.');
    }
  };

  // Delete transaction
  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
      // Refresh transactions
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      let txns = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      txns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(txns);
      const total = txns.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
      }, 0);
      setBalance(total);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete.');
    }
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // Loading states
  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-800"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  if (dataLoading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-black-500 text-l">Loading your data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-black-800">📊 Cash Manager</h1>
          <p className="italic md:text-xl not-italic text-xl font-bold text-black-600">
            {userProfile ? userProfile.fullName : user.email}
          </p>
        </div>
          <button
             onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 border border-red-300 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
      </div>

      {/* Enhanced Balance Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-5 mb-6 text-white">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-wide opacity-90">Current Balance</p>
          <span className="text-2xl">💰</span>
        </div>
        <p className="text-4xl font-bold mt-2">${balance.toFixed(2)}</p>
        <p className="text-xs mt-1 opacity-75">
          {balance >= 0 ? 'You’re doing great!' : 'Expenses exceed income'}
        </p>
      </div>

      {/* Enhanced Add Transaction Form */}
      <div className="bg-white rounded-xl shadow-md p-5 mb-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
          <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-2">+</span>
          Add Transaction
        </h2>
        <form onSubmit={handleAddTransaction} className="space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">📝</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Description"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">💵</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Add Transaction
          </button>
        </form>
      </div>

      {/* Enhanced Transaction History */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
          <span className="bg-purple-100 text-purple-600 p-2 rounded-lg mr-2">📋</span>
          History
        </h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No transactions yet. Add one above!</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{t.type === 'income' ? '💰' : '💸'}</span>
                  <div>
                    <p className="font-medium text-gray-800">{t.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <hr className="my-4 border-gray-200" />
      <p className="text-center text-gray-400 text-xs">
        Student Project – Next.js + Firebase
      </p>
    </Layout>
  );
}