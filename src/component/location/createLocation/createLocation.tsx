import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import type { Location } from '../../../models/location';

interface CreateLocationProps {
    visible: boolean;
    onHide: () => void;
    onSave: (location: Location) => void;
    editData: Location | null;
}

const CreateLocation = ({ visible, onHide, onSave, editData }: CreateLocationProps) => {
    const [form, setForm] = useState<Location>(
        () => editData ?? { name: '', address: '' },
    );

    const [submitted, setSubmitted] = useState(false);

    const requiredLabel = (text: string) => (
        <>{text} <span style={{ color: 'red' }}>*</span></>
    );

    const handleSave = () => {
        setSubmitted(true);
        if (!form.name.trim() || !form.address.trim()) return;
        onSave({ ...editData, ...form });
        onHide();
    };

    return (
        <Modal show={visible} onHide={onHide} centered size="lg" style={{ zIndex: 1050 }} enforceFocus={false}>
            <Modal.Header closeButton>
                <Modal.Title>{editData ? 'Edit Location' : 'Create Location'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 py-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <Form>
                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="loc-name">
                                <Form.Label className="fw-semibold">{requiredLabel('Name')}</Form.Label>
                                <InputText
                                    id="loc-name"
                                    value={form.name}
                                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter location name"
                                    className={`w-100${submitted && !form.name.trim() ? ' p-invalid' : ''}`}
                                />
                                {submitted && !form.name.trim() && <small className="text-danger">Name is required.</small>}
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="loc-address">
                                <Form.Label className="fw-semibold">{requiredLabel('Address')}</Form.Label>
                                <InputTextarea
                                    id="loc-address"
                                    value={form.address}
                                    onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Enter address"
                                    rows={2}
                                    autoResize
                                    className={`w-100${submitted && !form.address.trim() ? ' p-invalid' : ''}`}
                                />
                                {submitted && !form.address.trim() && <small className="text-danger">Address is required.</small>}
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

export default CreateLocation;
