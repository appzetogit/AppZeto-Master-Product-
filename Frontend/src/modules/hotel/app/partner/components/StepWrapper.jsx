import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const StepWrapper = ({ children, stepKey }) => {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={stepKey}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-xl mx-auto"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default StepWrapper;
