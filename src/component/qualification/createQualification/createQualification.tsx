import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { InputText } from 'primereact/inputtext';
import type { Qualification } from '../../../models/qualification';

interface CreateQualificationProps {
    visible: boolean;
    onHide: () => void;
    onSave: (qualification: Qualification) => void;
    editData: Qualification | null;
}

const CreateQualification = ({ visible, onHide, onSave, editData }: CreateQualificationProps) => {
    const [form, setForm] = useState<Qualification>(
        () => editData ?? { name: '' },
    );

    const [submitted, setSubmitted] = useState(false);

    const requiredLabel = (text: string) => (
        <>{text} <span style={{ color: 'red' }}>*</span></>
    );

    const handleSave = () => {
        setSubmitted(true);
        if (!form.name.trim()) return;
        onSave({ ...editData, ...form });
        onHide();
    };

    return (
        <Modal show={visible} onHide={onHide} centered size="lg" style={{ zIndex: 1050 }} enforceFocus={false}>
            <Modal.Header closeButton>
                <Modal.Title>{editData ? 'Edit Qualification' : 'Create Qualification'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 py-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <Form>
                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="qual-name">
                                <Form.Label className="fw-semibold">{requiredLabel('Name')}</Form.Label>
                                <InputText
                                    id="qual-name"
                                    value={form.name}
                                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter qualification name"
                                    className={`w-100${submitted && !form.name.trim() ? ' p-invalid' : ''}`}
                                />
                                {submitted && !form.name.trim() && <small className="text-danger">Name is required.</small>}
                            </Form.Group>
                        </div>
                    </div>
                </Form>
            </Modal.Body>
            <Modal.Footer className="px-4 py-3">
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="success" onClick={handleSave}>Save</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CreateQualification;
